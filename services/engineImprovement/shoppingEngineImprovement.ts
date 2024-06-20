import Shopping from '@models/shopping';
import secureShoppingProviders from '@data/scrapingTargets/shopping.json';
import BaseImprovement from '@services/engineImprovement/baseImprovement';
import WebScraper from '@services/webScraper';

class NewsEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;

    constructor(){
        super();
        this.webScraper = new WebScraper(this);
    };

    async secureProvidersBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'secureProviders';
    };

    getBulkOps(item: any): any{
        const { url, title, description, metaData } = item;
        return {
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { description, title, metaData, url } },
                upsert: true,
            }
        };
    };

    performBulkWrite(bulkOps: any[]): void {
        Shopping.bulkWrite(bulkOps, { ordered: false });
    }
};

export default NewsEngineImprovement;