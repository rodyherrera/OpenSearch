import Image from '@models/images';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';
import { ScrapedImage } from '@services/htmlDataExtractor';

/**
 * Class for improving images search engine.
 * @extends BaseImprovement
*/
class ImageEngineImprovement extends BaseImprovement{
    private imageScraper: WebScraper;
    
    /**
     * Creates an instance of ImageEngineImprovement.
    */
    constructor(){
        super();
        this.imageScraper = new WebScraper();
    };

    /**
     * Performs content-based improvement of images.
     * @param {number} [batchSize=1] - The number of websites to process in each batch.
     * @returns {Promise<void>} - A promise that resolves when improvement is complete.
    */
    async contentBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'contentBased';
        const totalDocuments = await Image.countDocuments();
        const getDataFunc = (createdAt: -1 | 1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const extractedImages = await this.imageScraper.getExtractedImages(websites);
            return extractedImages;
        };
        await this.processImprovement(method, batchSize, totalDocuments, getDataFunc(-1));
    };

    /**
     * Generates bulk write operations for images.
     * @param {ScrapedImage} item - The image data.
     * @returns {BulkWriteDocument} - The bulk write operation document.
    */
    getBulkOps(item: ScrapedImage): BulkWriteDocument{
        const { src, width, height, alt } = item;
        return {
            updateOne: {
                filter: { src },
                update: { $setOnInsert: { width, height, alt, src } },
                upsert: true
            }
        };
    };

    /**
     * Performs bulk write operations for images.
     * @param {any[]} bulkOps - The array of bulk write operations.
     * @returns {void}
    */
    performBulkWrite(bulkOps: any[]): void{
        Image.bulkWrite(bulkOps, { ordered: false });
    };
};

/**
 * Interface representing a bulk write operation document.
 * @interface
*/
interface BulkWriteDocument{
    updateOne: {
        filter: { src: string },
        update: {
            $setOnInsert: ScrapedImage
        },
        upsert: boolean
    }
};

export default ImageEngineImprovement;