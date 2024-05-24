import { EventEmitter } from 'events';
import Suggests from '@models/suggest';
import axios from 'axios';
import cheerio from 'cheerio';
import Website from '@models/website';

// @ts-ignore
import CDrakeSE from 'cdrake-se'; 

interface ScrapedLinkData{
    title?: string;
    description?: string;
    meta: { [key: string]: any };
};

const AXIOS_OPTS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
};

// Each improvement method will emit events related to the lifecycle 
// of its operation. Each event sends an object with the 'method'
// parameter, which indicates which improvisation method the 
// emitted event corresponds to.
class WebsiteEngineImprovement extends EventEmitter{
    async fetchHTML(link: string): Promise<string>{
        try{
            const response = await axios.get(link, AXIOS_OPTS);
            return response.data;
        }catch(error){
            this.emit('error', error);
            return '';
        }
    };

    async extractData(html: string): Promise<ScrapedLinkData>{
        const $ = cheerio.load(html);
        const data: ScrapedLinkData = { 
            title: $('head > title').text().trim(),
            description: $('meta[name="description"]').attr('content')?.trim(),
            meta: {} 
        };
        $('meta').each((_, element) => {
            const name = $(element).attr('name');
            const property = $(element).attr('property');
            const content = $(element).attr('content');
            if(!content) return;
            if(name){
                data.meta[name] = content;
            }else if(property){
                data.meta[property] = content;
            }
        });
        return data;
    };

    async scrapeSite(link: string): Promise<ScrapedLinkData | null>{
        try{
            const html = await this.fetchHTML(link);
            const data: ScrapedLinkData = await this.extractData(html);
            if(!data.title || !data.meta?.description) return null;
            return data;
        }catch(error){
            this.emit('error');
            return null;
        }
    };

    async suggestsBasedImprovement(batchSize: number = 5): Promise<any>{
        const method = 'suggestsBased';
        this.emit('improvementStart', { method });
        let skip = 0;
        while(true){
            const suggestions = await Suggests.aggregate([
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: batchSize },
                { $project: { _id: 0, suggest: 1 } }
            ]);
            if(suggestions.length === 0) break;
            const bulksOps = [];
            for(const { suggest } of suggestions){
                const webSearch = (await CDrakeSE({
                    Query: suggest,
                    Method: 'Search'
                })).Results;
                const links = webSearch.map(({ Link }: { Link: string }) => Link);
                this.emit('toScrapeLinks', { links });
                const promises = [];
                for(const link of links){
                    promises.push(this.scrapeSite(link));
                }
                const response = await Promise.allSettled(promises);
                const results = response.reduce((acc: any, result) => {
                    if(result.status === 'fulfilled' && result.value !== null){
                        acc.push({
                            insertOne: { document: result.value }
                        });
                    }
                    return acc;
                }, [] as any[]);
                bulksOps.push(...results);
            }
            await Website.bulkWrite(bulksOps);
            this.emit('batchProcessed', { data: bulksOps });
            skip += batchSize;
        }
        this.emit('improvementEnd', { method });
    };
};

export default WebsiteEngineImprovement;