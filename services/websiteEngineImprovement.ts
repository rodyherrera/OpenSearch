import Suggests from '@models/suggest';
import Website from '@models/website';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';

// @ts-ignore
import CDrakeSE from 'cdrake-se';

class WebsiteEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;

    constructor(){
        super();
        this.webScraper = new WebScraper();
    };

    private async processSuggest(suggest: string): Promise<BulkWriteDocument[]>{
        const links = await this.getLinksFromSuggest(suggest);
        const scrapedWebsites = await this.scrapeLinksAndExtractData(links);
        return scrapedWebsites.map(this.getBulkOps);
    };

    private async getLinksFromSuggest(suggest: string): Promise<string[]>{
        try{
            const { Results: webSearch } = await CDrakeSE({ Query: suggest, Method: 'Search' });
            return webSearch.map(({ Link }: { Link: string }) => Link);
        }catch (error){
            return [];
        }
    };

    private async scrapeLinksAndExtractData(links: string[]): Promise<BulkWriteDocument[]>{
        const promises = links.map((link) => this.webScraper.scrapeSite(link));
        const response = await Promise.allSettled(promises);
        return response.reduce((acc: any, result) => {
            if(result.status === 'fulfilled' && result.value !== null) acc.push(result.value);
            return acc;
        }, [] as any[]);
    };

    async hyperlinkBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'hyperlinkBased';
        const getDataFunc = (createdAt: number) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const extractedUrls = await this.webScraper.getExtractedUrls(websites);
            return await this.webScraper.getScrapedWebsites(extractedUrls);
        };
        await Promise.all([
            this.processImprovement(method, batchSize, getDataFunc(1)),
            this.processImprovement(method, batchSize, getDataFunc(-1))
        ]);
    };

    async suggestsBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'suggestsBased';
        const getDataFunc = (createdAt: number) => async (skip: number) => {
            const suggestions = await Suggests.aggregate([
                { $sort: { createdAt } },
                { $skip: skip },
                { $limit: batchSize },
                { $project: { _id: 0, suggest: 1 } },
            ]);
            const websitesPromises = suggestions.map(({ suggest }) => this.processSuggest(suggest));
            return (await Promise.all(websitesPromises)).flat();
        };
        await Promise.all([
            this.processImprovement(method, batchSize, getDataFunc(-1)),
            this.processImprovement(method, batchSize, getDataFunc(1))
        ]);
    };

    getBulkOps(item: any): BulkWriteDocument{
        const { url, title, description, metaData } = item;
        return {
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { description, title, metaData, url } },
                upsert: true,
            },
        };
    };

    performBulkWrite(bulkOps: any[]): void{
        Website.bulkWrite(bulkOps, { ordered: false });
    };
};

interface BulkWriteDocument {
    updateOne: {
        filter: { url: string };
        update: {
            $setOnInsert: {
                description: string;
                title: string;
                url: string;
                metaData: { [key: string]: any };
            };
        };
        upsert: boolean;
    };
}

export default WebsiteEngineImprovement;