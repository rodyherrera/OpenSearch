import { EventEmitter } from 'events';
import Website from '@models/website';
import PQueue from 'p-queue';

/**
 * A base class for improvements.
*/
class BaseImprovement extends EventEmitter{
    private queue: PQueue;

    constructor(){
        super();
        this.queue = new PQueue({ concurrency: 4 });
    };

    /**
     * Processes an improvement.
     * @param {string} method - The method to use for the improvement.
     * @param {number} batchSize - The batch size for processing.
     * @param {function} getDataFunc - A function to get the data for processing.
     * @returns {Promise<void>} A promise that resolves when the improvement is complete.
    */
    async processImprovement(
        method: string,
        batchSize: number,
        getDataFunc: (skip: number) => Promise<any[]>,
    ): Promise<void>{
        this.emit('improvementStart', { method });
        let skip = 0;
        let shouldContinue = true;
        while(shouldContinue){
            await this.queue.add(async () => {
                const data = await getDataFunc(skip);
                if(data.length === 0){
                    shouldContinue = false;
                    return;
                }
                const bulkOps = data.map(this.getBulkOps);
                await this.performBulkWrite(bulkOps);
                this.emit('batchProcessed', { data: bulkOps, method });
            });
            skip += batchSize;
        }
        await this.queue.onIdle();
        this.emit('improvementEnd');
    };

    /**
     * Gets websites from the database.
     * @param {number} skip - The number of documents to skip.
     * @param {number} limit - The number of documents to limit.
     * @param {number} createdAt - The sort order for the createdAt field.
     * @returns {Promise<{ url: string }[]>} A promise that resolves to an array of websites.
    */
    async getWebsitesFromDatabase(skip: number, limit: number, createdAt: -1 | 1): Promise<{ url: string }[]>{
        return await Website.aggregate([
            { $sort: { createdAt } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, url: 1 } }
        ]);
    };

    /**
     * Gets the bulk operations for an item.
     * @param {any} item - The item to get the bulk operations for.
     * @returns {any} The bulk operations.
    */
    getBulkOps(item: any){
        throw new Error('@services/baseImprovement.ts - getBulkOps - not implemented.');
    };

    /**
     * Performs a bulk write operation.
     * @param {any[]} bulkOps - The bulk operations to perform.
    */
    performBulkWrite(bulkOps: any[]): void{
        throw new Error('@services/baseImprovement.ts - performBulkWrite - not implemented.');
    };
};

export default BaseImprovement;