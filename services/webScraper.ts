import axios from 'axios';
import HtmlDataExtractor, { ScrapedAsset, ScrapedImage } from '@services/htmlDataExtractor';
import _ from 'lodash';

/**
 * Web Scraper Class
*/
class WebScraper{
    /**
     * Validates the scraped data.
     * @param {ScrapedLinkData} data - The scraped data.
     * @returns {boolean} Whether the data is valid.
    */
    private static validateScrapedData(data: ScrapedLinkData): boolean{
        return !!data.title && !!data.metaData?.description;
    };

    /**
     * Fetches the HTML content of a webpage.
     * @param {string} link - The URL of the webpage.
     * @returns {Promise<string>} A promise that resolves to the HTML content.
    */
    async fetchHTML(link: string): Promise<string>{
        try{
            const response = await axios.get(link, AXIOS_OPTS);
            return response.data;
        }catch(error){
            return '';
        };
    };

    /**
     * Extracts the content of a website.
     * @param {string} url - The URL of the website.
     * @returns {Promise<string>} A promise that resolves to the website content.
    */
    async getWebsiteContent(url: string): Promise<string>{
        console.log(url);
        const html = await this.fetchHTML(url);
        const dataExtractor = new HtmlDataExtractor(html);
        return dataExtractor.extractWebsiteContent();
    };

    /**
     * Extracts data from a webpage.
     * @param {string} html - The HTML content of the webpage.
     * @param {string} url - The URL of the webpage.
     * @returns {Promise<ScrapedLinkData>} A promise that resolves to the extracted data.
    */
    async extractData(html: string, url: string): Promise<ScrapedLinkData>{
        const dataExtractor = new HtmlDataExtractor(html);
        const data: ScrapedLinkData = {
            title: dataExtractor.extractTitle(),
            description: dataExtractor.extractDescription(),
            metaData: dataExtractor.extractMetaData(),
            url
        };
        return data;
    };

    /**
     * Scrapes a website and extracts data.
     * @param {string} link - The URL of the website.
     * @returns {Promise<ScrapedLinkData | null>} A promise that resolves to the scraped data or null.
    */
    async scrapeSite(link: string): Promise<ScrapedLinkData | null>{
        try{
            console.log('[To Scrape]:', link);
            const html = await this.fetchHTML(link);
            console.log('[OK]', link);
            const data: ScrapedLinkData = await this.extractData(html, link);
            return WebScraper.validateScrapedData(data) ? data : null;
        }catch(error){
            return null;
        }
    };

    /**
     * Creates an instance of HtmlDataExtractor from a URL.
     * @param {string} url - The URL from which to extract HTML data.
     * @returns {Promise<HtmlDataExtractor>} - A promise that resolves to an HtmlDataExtractor instance.
     * @private
    */
    private async createHtmlDataExtractorInstanceFromURL(url: string): Promise<HtmlDataExtractor>{
        try{
            const html = await this.fetchHTML(url);
            const dataExtractor = new HtmlDataExtractor(html, url);
            return dataExtractor;
        }catch(error){
            return new HtmlDataExtractor('');
        }
    };

    /**
     * Extracts data from a URL using a provided extraction method.
     * @template T
     * @param {string} url - The URL from which to extract data.
     * @param {(extractor: HtmlDataExtractor) => Promise<T>} extractMethod - The method to extract data from the HtmlDataExtractor.
     * @returns {Promise<T>} - A promise that resolves to the extracted data.
     * @private
    */
    private async extractDataFromURL<T>(url: string, extractMethod: (extractor: HtmlDataExtractor) => Promise<T>): Promise<T> {
        const dataExtractor = await this.createHtmlDataExtractorInstanceFromURL(url);
        return extractMethod(dataExtractor);
    };

    /**
     * Extracts hyperlinks from a URL.
     * @param {string} url - The URL from which to extract hyperlinks.
     * @returns {Promise<string[]>} - A promise that resolves to an array of extracted hyperlinks.
    */
    async extractHyperlinksFromURL(url: string): Promise<string[]> {
        console.log(url);
        return this.extractDataFromURL(url, extractor => Promise.resolve(extractor.extractLinks()));
    };

    /**
     * Extracts images from a URL.
     * @param {string} url - The URL from which to extract images.
     * @returns {Promise<ScrapedImage[]>} - A promise that resolves to an array of extracted images.
    */
    async extractImagesFromURL(url: string): Promise<ScrapedImage[]> {
        return this.extractDataFromURL(url, extractor => Promise.resolve(extractor.exctractAllImages()));
    };

    /**
     * Extracts assets from a URL.
     * @param {string} url - The URL from which to extract assets.
     * @returns {Promise<ScrapedAsset[]>} - A promise that resolves to an array of extracted assets.
    */
    async extractAssetsFromURL(url: string): Promise<ScrapedAsset[]> {
        console.log(url);
        return this.extractDataFromURL(url, extractor => Promise.resolve(extractor.extractAssets()));
    };

    /**
     * Gets extracted data from multiple websites.
     * @template T
     * @param {{ url: string }[]} websites - An array of websites.
     * @param {(url: string) => Promise<T[]>} extractMethod - The method to extract data from each URL.
     * @returns {Promise<T[]>} - A promise that resolves to an array of extracted data from all websites.
     * @private
    */
    private async getExtractedDataFromWebsites<T>(websites: { url: string }[], extractMethod: (url: string) => Promise<T[]>): Promise<T[]>{
        const promises = websites.map(({ url }) => extractMethod(url));
        const extractedDataArray = await Promise.all(promises);
        return extractedDataArray.flat();
    };

    /**
     * Gets extracted images from multiple websites.
     * @param {{ url: string }[]} websites - An array of websites.
     * @returns {Promise<ScrapedImage[]>} - A promise that resolves to an array of extracted images from all websites.
    */
    async getExtractedImages(websites: { url: string }[]): Promise<ScrapedImage[]>{
        const promises = _.map(websites, ({ url }) => this.extractImagesFromURL(url));
        const extractedImagesArray = await Promise.all(promises);
        return _.flatMap(extractedImagesArray);
    };

    /**
     * Gets extracted assets from multiple websites.
     * @param {{ url: string }[]} websites - An array of websites.
     * @returns {Promise<ScrapedAsset[]>} - A promise that resolves to an array of extracted assets from all websites.
    */
    async getExtractedAssets(websites: { url: string }[]): Promise<ScrapedAsset[]>{
        const promises = _.map(websites, ({ url }) => this.extractAssetsFromURL(url));
        const extractedAssetsArray = await Promise.all(promises);
        return _.flatMap(extractedAssetsArray);
    };

    /**
     * Gets extracted URLs from multiple websites.
     * @param {{ url: string }[]} websites - An array of websites.
     * @returns {Promise<string[]>} - A promise that resolves to an array of extracted URLs from all websites.
    */
    async getExtractedUrls(websites: { url: string }[]): Promise<string[]>{
        const promises = _.map(websites, ({ url }) => this.extractHyperlinksFromURL(url));
        const extractedUrlsArray = await Promise.all(promises);
        return _.flatMap(extractedUrlsArray);
    };

    /**
     * Scrapes an array of websites and extracts data.
     * @param {string[]} extractedUrls - An array of URLs to scrape.
     * @returns {Promise<ScrapedLinkData[]>} A promise that resolves to an array of scraped data.
    */
    async getScrapedWebsites(extractedUrls: string[]): Promise<ScrapedLinkData[]>{
        const scrapedWebsitesPromises = extractedUrls.map((url) => this.scrapeSite(url));
        const scrapedWebsites = await Promise.allSettled(scrapedWebsitesPromises);
        return scrapedWebsites.reduce((acc: ScrapedLinkData[], result) => {
            if(result.status === 'fulfilled' && result.value !== null){
                acc.push(result.value);
            }
            return acc;
        }, [] as ScrapedLinkData[]);
    };
};

/**
 * Defines the shape of the scraped data.
 * @interface
*/
interface ScrapedLinkData{
    title?: string;
    description?: string;
    url: string;
    metaData: { [key: string]: any };
};

const AXIOS_OPTS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
};

export default WebScraper;