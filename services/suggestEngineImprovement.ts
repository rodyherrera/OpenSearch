import BaseImprovement from '@services/baseImprovement';
import { getUniqueKeywords } from '@utilities/websites';
import { suggestionsFromContent } from '@utilities/suggestions';
import WebScraper from '@services/webScraper';
import Suggest from '@models/suggest';

class SuggestEngineImprovement extends BaseImprovement {
    private webScraper: WebScraper;

    constructor(){
        super();
        this.webScraper = new WebScraper();
    };

    async contentBasedImprovement(batchSize: number = 5): Promise<void>{
        const method = 'contentBased';
        await this.processImprovement(method, batchSize, async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize);
            const contentsPromise = websites.map(({ url }) => this.webScraper.getWebsiteContent(url));
            const contents = await Promise.all(contentsPromise);
            const keywordsPromise = contents.map((content) => suggestionsFromContent(content, 5));
            const keywords = await Promise.all(keywordsPromise);
            return Array.from(new Set(keywords.flat()));
        });
    };

    async keywordBasedImprovement(batchSize: number = 1000): Promise<void>{
        const method = 'keywordBased';
        await this.processImprovement(method, batchSize, async (skip: number) =>{
            const uniqueKeywords = await getUniqueKeywords([
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: batchSize }
            ]);
            return uniqueKeywords.map(({ keyword }) => keyword);
        });
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