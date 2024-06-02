import Asset from '@models/asset';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';
import { ScrapedAsset } from '@services/htmlDataExtractor';

class AssetEngineImprovement extends BaseImprovement{
    private assetScraper: WebScraper;

    constructor(){
        super();
        this.assetScraper = new WebScraper();
    };

    async contentBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'contentBased';
        const getDataFunc = (createdAt: -1 | 1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const extractedAssets = await this.assetScraper.getExtractedAssets(websites);
            return extractedAssets;
        };
        await Promise.all([
            this.processImprovement(method, batchSize, getDataFunc(-1)),
            this.processImprovement(method, batchSize, getDataFunc(1))
        ]);
    };

    getBulkOps(item: ScrapedAsset): BulkWriteDocument{
        const { url, parentUrl, type } = item;
        return {
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { url, parentUrl, type } },
                upsert: true
            }
        };
    };

    performBulkWrite(bulkOps: any[]): void{
        Asset.bulkWrite(bulkOps, { ordered: false });
    }
};

interface BulkWriteDocument{
    updateOne: {
        filter: { url: string },
        update: { $setOnInsert: ScrapedAsset },
        upsert: boolean
    }
};

export default AssetEngineImprovement;