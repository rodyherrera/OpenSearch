import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';
import Suggest from '@models/suggest';
import PQueue from 'p-queue';
import { getUniqueKeywords } from '@utilities/websites';
import { suggestionsFromContent } from '@utilities/suggestions';

class SuggestEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;
    private suggestQueue: PQueue;

    constructor(){
        super();
        this.webScraper = new WebScraper();
        this.suggestQueue = new PQueue({ concurrency: 5 });
    };

    async contentBasedImprovement(batchSize: number = 5): Promise<void>{
        const method = 'contentBased';
        const getDataFunc = (createdAt: 1 | -1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const contents = await this.suggestQueue.addAll(websites.map(({ url }) => () => this.webScraper.getWebsiteContent(url)));
            const keywords = await this.suggestQueue.addAll(contents.map((content) => () => suggestionsFromContent(content, 5)));
            return Array.from(new Set(keywords.flat()));
        };
        await Promise.all([
            this.processImprovement(method, batchSize, getDataFunc(1)),
            this.processImprovement(method, batchSize, getDataFunc(-1))
        ]);
    };

    async keywordBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'keywordBased';
        const getDataFunc = (createdAt: number) => async (skip: number) => {
            const uniqueKeywords = await getUniqueKeywords([
                { $sort: { createdAt } },
                { $skip: skip },
                { $limit: batchSize }
            ]);
            return uniqueKeywords.map(({ keyword }) => keyword);
        };
        await Promise.all([
            this.processImprovement(method, batchSize, getDataFunc(1)),
            this.processImprovement(method, batchSize, getDataFunc(-1))
        ]);
    };

    async performBulkWrite(bulkOps: any[]): Promise<void>{
        await Suggest.bulkWrite(bulkOps, { ordered: false });
    };

    getBulkOps(item: any): any{
        return {
            updateOne: {
                filter: { suggest: item },
                update: { $setOnInsert: { suggest: item } },
                upsert: true
            }
        };
    };
};

export default SuggestEngineImprovement;