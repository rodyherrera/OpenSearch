import axios from 'axios';
import HtmlDataExtractor from '@services/htmlDataExtractor';

class WebScraper{
    private static validateScrapedData(data: ScrapedLinkData): boolean{
        return !!data.title && !!data.metaData?.description;
    };

    async fetchHTML(link: string): Promise<string>{
        try{
            const response = await axios.get(link, AXIOS_OPTS);
            return response.data;
        }catch(error){
            return '';
        };
    };

    async getWebsiteContent(url: string): Promise<string>{
        const html = await this.fetchHTML(url);
        const dataExtractor = new HtmlDataExtractor(html);
        return dataExtractor.extractWebsiteContent();
    };

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

    async scrapeSite(link: string): Promise<ScrapedLinkData | null>{
        try{
            const html = await this.fetchHTML(link);
            const data: ScrapedLinkData = await this.extractData(html, link);
            return WebScraper.validateScrapedData(data) ? data : null;
        }catch(error){
            return null;
        }
    };

    async extractHyperlinksFromURL(url: string): Promise<string[]>{
        try{
            const html = await this.fetchHTML(url);
            const dataExtractor = new HtmlDataExtractor(html);
            return dataExtractor.extractLinks();
        }catch(error){
            return [];
        }
    };

    async getExtractedUrls(websites: { url: string }[]): Promise<string[]>{
        const promises = websites.map(({ url }) => this.extractHyperlinksFromURL(url));
        const extractedUrlsArray = await Promise.all(promises);
        return extractedUrlsArray.flat();
    };

    async getScrapedWebsites(extractedUrls: string[]): Promise<ScrapedLinkData[]>{
        const scrapedWebsitesPromises = extractedUrls.map((url) => this.scrapeSite(url));
        const scrapedWebsites = await Promise.allSettled(scrapedWebsitesPromises);
        console.log(scrapedWebsites);
        return scrapedWebsites.reduce((acc: ScrapedLinkData[], result) => {
            if(result.status === 'fulfilled' && result.value !== null){
                acc.push(result.value);
            }
            return acc;
        }, [] as ScrapedLinkData[]);
    };
};

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