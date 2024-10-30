import News from '@models/news';
import secureNewsProviders from '@data/scrapingTargets/news.json';
import BaseImprovement, { baseImprovementOpts } from '@services/engineImprovement/baseImprovement';
import WebScraper from '@services/webScraper';

class NewsEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;

    constructor(opts : baseImprovementOpts){
        super(opts);
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

    async performBulkWrite(bulkOps: any[]): Promise<void> {
        News.bulkWrite(bulkOps, { ordered: false });
    }
};

export default NewsEngineImprovement;