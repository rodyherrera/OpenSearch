import axios from 'axios';
import HtmlDataExtractor, { ScrapedAsset, ScrapedImage } from '@services/htmlDataExtractor';

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
            const html = await this.fetchHTML(link);
            const data: ScrapedLinkData = await this.extractData(html, link);
            return WebScraper.validateScrapedData(data) ? data : null;
        }catch(error){
            return null;
        }
    };

    private async createHtmlDataExtractorInstanceFromURL(url: string): Promise<HtmlDataExtractor>{
        try{
            const html = await this.fetchHTML(url);
            const dataExtractor = new HtmlDataExtractor(html, url);
            return dataExtractor;
        }catch(error){
            return new HtmlDataExtractor('');
        }
    };

    private async extractDataFromURL<T>(url: string, extractMethod: (extractor: HtmlDataExtractor) => Promise<T>): Promise<T> {
    const dataExtractor = await this.createHtmlDataExtractorInstanceFromURL(url);
    return extractMethod(dataExtractor);
    }

    async extractHyperlinksFromURL(url: string): Promise<string[]> {
        return this.extractDataFromURL(url, extractor => Promise.resolve(extractor.extractLinks()));
    }

    async extractImagesFromURL(url: string): Promise<ScrapedImage[]> {
        return this.extractDataFromURL(url, extractor => Promise.resolve(extractor.extractImages()));
    }

    async extractAssetsFromURL(url: string): Promise<ScrapedAsset[]> {
        return this.extractDataFromURL(url, extractor => Promise.resolve(extractor.extractAssets()));
    }

    private async getExtractedDataFromWebsites<T>(websites: { url: string }[], extractMethod: (url: string) => Promise<T[]>): Promise<T[]>{
        const promises = websites.map(({ url }) => extractMethod(url));
        const extractedDataArray = await Promise.all(promises);
        return extractedDataArray.flat();
    }

    async getExtractedImages(websites: { url: string }[]): Promise<ScrapedImage[]>{
        return this.getExtractedDataFromWebsites(websites, url => this.extractImagesFromURL(url));
    }

    async getExtractedAssets(websites: { url: string }[]): Promise<ScrapedAsset[]>{
        return this.getExtractedDataFromWebsites(websites, url => this.extractAssetsFromURL(url));
    }

    async getExtractedUrls(websites: { url: string }[]): Promise<string[]>{
        return this.getExtractedDataFromWebsites(websites, url => this.extractHyperlinksFromURL(url));
    }

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