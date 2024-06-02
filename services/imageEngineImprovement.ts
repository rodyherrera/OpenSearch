import Image from '@models/images';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';
import { ScrapedImage } from '@services/htmlDataExtractor';

class ImageEngineImprovement extends BaseImprovement{
    private imageScraper: WebScraper;

    constructor(){
        super();
        this.imageScraper = new WebScraper();
    };

    async contentBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'contentBased';
        const getDataFunc = (createdAt: -1 | 1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const extractedImages = await this.imageScraper.getExtractedImages(websites);
            return extractedImages;
        };
        await Promise.all([
            this.processImprovement(method, batchSize, getDataFunc(-1)),
            this.processImprovement(method, batchSize, getDataFunc(1))
        ]);
    };

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

    performBulkWrite(bulkOps: any[]): void{
        Image.bulkWrite(bulkOps, { ordered: false });
    };
};

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