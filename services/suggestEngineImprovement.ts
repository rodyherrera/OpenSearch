import { EventEmitter } from 'events';
import Website, { getUniqueKeywords, getWebsiteContent } from '@models/website';
import Suggest, { suggestionsFromContent } from '@models/suggest';

class SuggestEngineImprovement extends EventEmitter{
    async processImprovement(method: string, batchSize: number, getDataFunc: (skip: number) => Promise<any[]>): Promise<void>{
        this.emit('improvementStart', { method });
        let skip = 0;
        while(true){
            const data = await getDataFunc(skip);
            if(data.length === 0) break;
            const bulksOps = data.map(this.getBulkOps);
            await Suggest.bulkWrite(bulksOps, { ordered: false });
            this.emit('batchProcessed', { data: bulksOps, method });
            skip += batchSize;
        }
        this.emit('improvementEnd', { method });
    };

    async contentBasedImprovement(batchSize: number = 5): Promise<void>{
        const method = 'contentBased';
        const getDataFunc = async (skip: number) => {
            const websites = await Website.aggregate([
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: batchSize },
                { $project: { _id: 0, url: 1 } }
            ]);
            const contentsPromise = websites.map(({ url }) => getWebsiteContent(url));
            const contents = await Promise.all(contentsPromise);
            const keywordsPromise = contents.map((content) => suggestionsFromContent(content, 5));
            const keywords = await Promise.all(keywordsPromise);
            return Array.from(new Set(keywords.flat()));
        };
        await this.processImprovement(method, batchSize, getDataFunc);
    };

    async keywordBasedImprovement(batchSize: number = 1000): Promise<void>{
        const method = 'keywordBased';
        const getDataFunc = async (skip: number) => {
            const uniqueKeywords = await getUniqueKeywords([
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: batchSize }
            ]);
            return uniqueKeywords.map(({ keyword }) => keyword);
        };
        await this.processImprovement(method, batchSize, getDataFunc);
    };

    getBulkOps(item: any){
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