import BaseImprovement from '@services/baseImprovement';
import { getUniqueKeywords, getWebsiteContent } from '@models/website';
import Suggest, { suggestionsFromContent } from '@models/suggest';

class SuggestEngineImprovement extends BaseImprovement{
    async contentBasedImprovement(batchSize: number = 5): Promise<void>{
        const method = 'contentBased';
        const getDataFunc = async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize);
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

    async performBulkWrite(bulkOps: any[]): Promise<void>{
        await Suggest.bulkWrite(bulkOps, { ordered: false });
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