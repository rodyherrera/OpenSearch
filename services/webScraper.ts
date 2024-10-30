import axios from 'axios';
import { EventEmitter } from 'events';
import HtmlDataExtractor, { ScrapedAsset, ScrapedImage } from '@services/htmlDataExtractor';
import logger from '@utilities/logger';

/**
 * Web Scraper Class
 */
class WebScraper{
    private eventEmitter: EventEmitter;
    private batchSize: number;

    constructor(eventEmitter: EventEmitter, batchSize = 300){
        this.eventEmitter = eventEmitter;
        this.batchSize = batchSize;
    }

    /**
     * Validates the scraped data.
     * @param {ScrapedLinkData} data - The scraped data.
     * @returns {boolean} Whether the data is valid.
     */
    private static validateScrapedData(data: ScrapedLinkData): boolean{
        return Boolean(data.title && data.metaData?.description);
    }

    /**
     * Fetches the HTML content of a webpage.
     * @param {string} link - The URL of the webpage.
     * @returns {Promise<string>} A promise that resolves to the HTML content.
     */
    async fetchHTML(link: string): Promise<string>{
        try{
            const response = await axios.get(link, { ...AXIOS_OPTS, responseType: 'stream' });
            let data = '';
            for await(const chunk of response.data){
                data += chunk;
            }
            return data;
        }catch(error){
            logger.error(`Failed to fetch HTML for ${link}: ${error}`);
            return '';
        }
    }

    /**
     * Extracts the content of a website.
     * @param {string} url - The URL of the website.
     * @returns {Promise<string>} A promise that resolves to the website content.
     */
    async getWebsiteContent(url: string): Promise<string>{
        this.eventEmitter.emit('fetchingWebsiteContent', { url });
        const html = await this.fetchHTML(url);
        if(!html) return '';
        
        const dataExtractor = new HtmlDataExtractor(html, undefined, this.eventEmitter);
        this.eventEmitter.emit('fetchedWebsiteContent', { url, html });
        
        return dataExtractor.extractWebsiteContent();
    }

    /**
     * Extracts data from a webpage.
     * @param {string} html - The HTML content of the webpage.
     * @param {string} url - The URL of the webpage.
     * @returns {Promise<ScrapedLinkData>} A promise that resolves to the extracted data.
     */
    async extractData(html: string, url: string): Promise<ScrapedLinkData>{
        if(!html) return { url, metaData: {} };
        
        this.eventEmitter.emit('fetchingWebsiteMetaData', { html, url });
        const dataExtractor = new HtmlDataExtractor(html, undefined, this.eventEmitter);
        const data: ScrapedLinkData = {
            title: dataExtractor.extractTitle(),
            description: dataExtractor.extractDescription(),
            metaData: dataExtractor.extractMetaData(),
            url,
        };
        this.eventEmitter.emit('fetchedWebsiteMetaData', { html, url, data });
        return data;
    }

    /**
     * Scrapes a website and extracts data.
     * @param {string} url - The URL of the website.
     * @returns {Promise<ScrapedLinkData | null>} A promise that resolves to the scraped data or null.
     */
    async scrapeSite(url: string): Promise<ScrapedLinkData | null>{
        try{
            this.eventEmitter.emit('scrapingWebsite', { url });
            logger.debug(`@scrapeSite: Scraping ${url}`);
            const html = await this.fetchHTML(url);
            if(!html) return null;
            
            const startTime = Date.now();
            const htmlSize = Buffer.byteLength(html, 'utf-8');
            const data = await this.extractData(html, url);
            const elapsedTime = Date.now() - startTime;

            logger.debug(`@scrapeSite: OK ${url.slice(0, 20)}..., HTML Size ${htmlSize} bytes, Elapsed Time ${elapsedTime} ms`);
            this.eventEmitter.emit('websiteScraped', { url, html, data });
            
            return WebScraper.validateScrapedData(data) ? data : null;
        }catch(error){
            logger.error(`@scrapeSite error: ${error}`);
            return null;
        }
    }

    /**
     * Gets extracted images from multiple websites.
     * @param {{ url: string }[]} websites - An array of websites.
     * @returns {Promise<ScrapedImage[]>} - A promise that resolves to an array of extracted images from all websites.
     */
    async getExtractedImages(websites: { url: string }[]): Promise<ScrapedImage[]>{
        const extractedImagesArray = await Promise.all(
            websites.map(({ url }) => this.extractDataFromURL(url, extractor => extractor.exctractAllImages()))
        );
        return extractedImagesArray.flat();
    }

    async getExtractedAssets(websites: { url: string }[]): Promise<ScrapedAsset[]>{
        const extractedAssetsArray = await Promise.all(
            websites.map(({ url }) => this.extractDataFromURL(url, extractor => extractor.extractAssets()))
        );
        return extractedAssetsArray.flat();
    }

    /**
     * Gets extracted URLs from multiple websites.
     * @param {{ url: string }[]} websites - An array of websites.
     * @returns {Promise<string[]>} - A promise that resolves to an array of extracted URLs from all websites.
     */
    async getExtractedUrls(
        websites: { url: string }[],
        opts: { includeSameDomain: boolean; restrictThirdPartyDomains: boolean }
    ): Promise<string[]>{
        const extractedUrlsArray = await Promise.all(
            websites.map(({ url }) => this.extractDataFromURL(url, extractor => extractor.extractLinks(opts.includeSameDomain, opts.restrictThirdPartyDomains)))
        );
        return extractedUrlsArray.flat();
    }

    /**
     * Scrapes an array of websites and extracts data.
     * @param {string[]} extractedUrls - An array of URLs to scrape.
     * @returns {Promise<ScrapedLinkData[]>} A promise that resolves to an array of scraped data.
     */
    async getScrapedWebsites(extractedUrls: string[]): Promise<ScrapedLinkData[]> {
        const results: ScrapedLinkData[] = [];
        for(let i = 0; i < extractedUrls.length; i += this.batchSize){
            const batch = extractedUrls.slice(i, i + this.batchSize);
            const scrapedBatch = await Promise.allSettled(batch.map(url => this.scrapeSite(url)));
            const fulfilledResults = scrapedBatch.reduce((acc, result) => {
                if(result.status === 'fulfilled' && result.value){
                    acc.push(result.value);
                }
                return acc;
            }, [] as ScrapedLinkData[]);
            results.push(...fulfilledResults);
        }
        return results;
    }

    /**
     * Extracts data from a URL using a provided extraction method.
     * @template T
     * @param {string} url - The URL from which to extract data.
     * @param {(extractor: HtmlDataExtractor) => Promise<T>} extractMethod - The method to extract data from the HtmlDataExtractor.
     * @returns {Promise<T>} - A promise that resolves to the extracted data.
     * @private
     */
    private async extractDataFromURL<T>(url: string, extractMethod: (extractor: HtmlDataExtractor) => Promise<T>): Promise<T>{
        const dataExtractor = await this.createHtmlDataExtractorInstanceFromURL(url);
        return extractMethod(dataExtractor);
    }

    /**
     * Creates an instance of HtmlDataExtractor from a URL.
     * @param {string} url - The URL from which to extract HTML data.
     * @returns {Promise<HtmlDataExtractor>} - A promise that resolves to an HtmlDataExtractor instance.
     * @private
     */
    private async createHtmlDataExtractorInstanceFromURL(url: string): Promise<HtmlDataExtractor>{
        const html = await this.fetchHTML(url);
        return new HtmlDataExtractor(html, url, this.eventEmitter);
    }
}

/**
 * Defines the shape of the scraped data.
 * @interface
 */
interface ScrapedLinkData{
    title?: string;
    description?: string;
    url: string;
    metaData: { [key: string]: any };
}

const AXIOS_OPTS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
};

export default WebScraper;
