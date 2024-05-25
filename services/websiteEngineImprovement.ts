import Suggests from '@models/suggest';
import Website from '@models/website';
import BaseImprovement from './baseImprovement';
import WebScraper from './webScraper';

// @ts-ignore
import CDrakeSE from 'cdrake-se'; 

interface BulkWriteDocument{
    updateOne: {
        filter: { url: string },
        update: {
            $setOnInsert: {
                description: string,
                title: string,
                url: string,
                metaData: { [key: string]: any }
            }
        },
        upsert: boolean
    }
};

class WebsiteEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;

    constructor(){
        super();
        this.webScraper = new WebScraper();
    };

    async processSuggest(suggest: string): Promise<BulkWriteDocument[]>{
        try{
            const webSearch = (await CDrakeSE({
                Query: suggest,
                Method: 'Search'
            })).Results;
            const links = webSearch.map(({ Link }: { Link: string }) => Link);
            this.emit('toScrapeLinks', { links });
            const promises = [];
            for(const link of links){
                promises.push(this.webScraper.scrapeSite(link));
            }
            const response = await Promise.allSettled(promises);
            const results = response.reduce((acc: any, result) => {
                if(result.status === 'fulfilled' && result.value !== null){
                    acc.push(result.value);
                }
                return acc;
            }, [] as any[]);
            return results;
        }catch(error){
            return [];
        }
    };

    async hyperlinkBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'hyperlinkBased';
        const getDataFunc = async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize);
            const extractedUrls = await this.webScraper.getExtractedUrls(websites);
            const scrapedWebsites = await this.webScraper.getScrapedWebsites(extractedUrls);
            return scrapedWebsites;
        };
        await this.processImprovement(method, batchSize, getDataFunc);
    };

    async suggestsBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'suggestsBased';
        const getDataFunc = async (skip: number) => {
            const suggestions = await Suggests.aggregate([
                { $sort: { createdAt: 1 } },
                { $skip: skip },
                { $limit: batchSize },
                { $project: { _id: 0, suggest: 1 } }
            ]);
            const websitesPromises = suggestions.map(({ suggest }) => this.processSuggest(suggest));
            const websites = await Promise.all(websitesPromises);
            return websites.flat();
        };
        await this.processImprovement(method, batchSize, getDataFunc);
    };

    getBulkOps(item: any): BulkWriteDocument{
        const { url, title, description, metaData } = item;
        return {
            updateOne: {
                filter: { url },
                update: { $setOnInsert:  { description, title, metaData, url } },
                upsert: true
            }
        };
    };

    async performBulkWrite(bulkOps: BulkWriteDocument[]): Promise<void>{
        await Website.bulkWrite(bulkOps, { ordered: false });
    };
};

export default WebsiteEngineImprovement;