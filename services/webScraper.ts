import axios from 'axios';
import cheerio from 'cheerio';

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

class WebScraper{
    async fetchHTML(link: string): Promise<string>{
        try{
            const response = await axios.get(link, AXIOS_OPTS);
            return response.data;
        }catch(error){
            return '';
        };
    };

    async extractData(html: string, url: string): Promise<ScrapedLinkData>{
        const $ = cheerio.load(html);
        const data: ScrapedLinkData = { 
            title: $('head > title').text().trim(),
            description: $('meta[name="description"]').attr('content')?.trim(),
            metaData: {},
            url
        };
        $('meta').each((_, element) => {
            const name = $(element).attr('name');
            const property = $(element).attr('property');
            const content = $(element).attr('content');
            if(!content) return;
            if(name){
                data.metaData[name] = content;
            }else if(property){
                data.metaData[property] = content;
            }
        });
        return data;
    };

    async scrapeSite(link: string): Promise<ScrapedLinkData | null>{
        try{
            const html = await this.fetchHTML(link);
            const data: ScrapedLinkData = await this.extractData(html, link);
            if(!data.title || !data.metaData?.description) return null;
            return data;
        }catch(error){
            return null;
        }
    };

    async extractHyperlinksFromURL(url: string): Promise<string[]>{
        const urls = [];
        try{
            const html = await this.fetchHTML(url);
            const regex = /href\s*=\s*['"]([^'"]+)['"]/gi;
            let match;
            while((match = regex.exec(html)) !== null){
                const url = match[1];
                if((url.startsWith('http://') || url.startsWith('https://'))){
                    urls.push(url);
                }
            }
            return urls;
        }catch(error){
            return urls;
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
        return scrapedWebsites.reduce((acc: ScrapedLinkData[], result) => {
            if(result.status === 'fulfilled' && result.value !== null){
                acc.push(result.value);
            }
            return acc;
        }, [] as ScrapedLinkData[]);
    };
};

export default WebScraper;