import Asset from '@models/asset';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';
import { ScrapedAsset } from '@services/htmlDataExtractor';

/**
 * Class for improving assets search engine.
 * @extends BaseImprovement
*/
class AssetEngineImprovement extends BaseImprovement{
    private assetScraper: WebScraper;

    /**
     * Creates an instance of AssetEngineImprovement.
    */
    constructor(){
        super();
        this.assetScraper = new WebScraper(this);
    };

    /**
     * Performs content-based improvement of assets.
     * @param {number} [batchSize=1] - The number of websites to process in each batch.
     * @returns {Promise<void>} - A promise that resolves when improvement is complete.
    */
    async contentBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'contentBased';
        const totalDocuments = await Asset.countDocuments();
        const getDataFunc = (createdAt: -1 | 1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const extractedAssets = await this.assetScraper.getExtractedAssets(websites);
            return extractedAssets;
        };
        this.processImprovement(method, batchSize, totalDocuments, getDataFunc(-1));
    };

    /**
     * Generates bulk write operations for assets.
     * @param {ScrapedAsset} item - The asset data.
     * @returns {BulkWriteDocument} - The bulk write operation document.
    */
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

    /**
     * Performs bulk write operations for assets.
     * @param {any[]} bulkOps - The array of bulk write operations.
     * @returns {void}
    */
    performBulkWrite(bulkOps: any[]): void{
        Asset.bulkWrite(bulkOps, { ordered: false });
    }
};

/**
 * Interface representing a bulk write operation document.
 * @interface
*/
interface BulkWriteDocument{
    updateOne: {
        filter: { url: string },
        update: { $setOnInsert: ScrapedAsset },
        upsert: boolean
    }
};

export default AssetEngineImprovement;