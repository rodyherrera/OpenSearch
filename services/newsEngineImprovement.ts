import News from '@models/news';
import secureNewsProviders from '@data/scrapingTargets/news.json';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';

class NewsEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;

    constructor(){
        super();
        this.webScraper = new WebScraper(this);
    };

    async secureProvidersBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'secureProviders';
        const getDataFunc = () => async (skip: number) => {
            const news = secureNewsProviders.slice(skip, skip + batchSize).map((url) => ({ url }));
            const urlsExtracted = await this.webScraper.getExtractedUrls(news, {
                restrictThirdPartyDomains: true, 
                includeSameDomain: true 
            });
            return await this.webScraper.getScrapedWebsites(urlsExtracted);
        };
        this.processImprovement(method, batchSize, secureNewsProviders.length, getDataFunc());
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
        News.bulkWrite(bulkOps, { ordered: false });
    }
};

export default NewsEngineImprovement;