import { EventEmitter } from 'events';
import Website from '@models/website';
import logger from '@utilities/logger';
import _ from 'lodash';

export interface baseImprovementOpts {
    groupSize?: number,
    concurrency?: number
};

/**
 * A base class for improvements.
 */
class BaseImprovement extends EventEmitter {
    private groupSize: number;
    private concurrency: number;

    constructor({ groupSize = 500, concurrency = 100 }: baseImprovementOpts = {}) {
        super();
        this.groupSize = groupSize;
        this.concurrency = concurrency;
    }

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
        totalDataSize: number,
        getDataFunc: (skip: number) => Promise<any[]>
    ): Promise<void> {
        this.emit('improvementStart', { method });
        const totalBatches = Math.ceil(totalDataSize / batchSize);
        const totalGroups = Math.ceil(totalBatches / this.groupSize);
        logger.debug(`@processImprovement: Method (${method}), Batch Size (${batchSize}), Total Data Size (${totalDataSize}), Total Batches (${totalBatches}), Total Groups (${totalGroups})`);
        
        for(let group = 0; group < totalGroups; group++){
            const batches = Math.min((group + 1) * this.groupSize, totalBatches);
            const batchPromises = [];
    
            for(let i = group * this.groupSize; i < batches; i++){
                const skip = i * batchSize;
    
                const task = async () => {
                    const data = await getDataFunc(skip);
                    if (data.length === 0) return;
    
                    logger.debug(`@processImprovement: Working on [${group}/${i}]...`);
                    const bulkOps = _.flatMap(data, this.getBulkOps.bind(this));
                    await this.performBulkWrite(bulkOps);
                    logger.debug(`@processImprovement: OK [${group}/${i}] of [${totalGroups}/${batches}]`);
                    this.emit('batchProcessed', { method, data: bulkOps });
                    bulkOps.length = 0;
                };

                if(batchPromises.length >= this.concurrency){
                    await Promise.race(batchPromises);
                    for(let j = batchPromises.length - 1; j >= 0; j--){
                        if((await batchPromises[j]).isFulfilled){
                            batchPromises.splice(j, 1);
                        }
                    }
                }
    
                const wrappedTask = task().then(() => ({ isFulfilled: true }));
                batchPromises.push(wrappedTask);
            }
    
            await Promise.all(batchPromises);
        }
    
        this.emit('improvementEnd', { method });
    }
    

    /**
     * Gets websites from the database.
     * @param {number} skip - The number of documents to skip.
     * @param {number} limit - The number of documents to limit.
     * @param {number} createdAt - The sort order for the createdAt field.
     * @returns {Promise<{ url: string }[]>} A promise that resolves to an array of websites.
     */
    async getWebsitesFromDatabase(skip: number, limit: number, createdAt: -1 | 1): Promise<{ url: string }[]> {
        return await Website.aggregate([
            { $sort: { createdAt } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, url: 1 } }
        ]);
    }

    /**
     * Gets the bulk operations for an item.
     * @param {any} item - The item to get the bulk operations for.
     * @returns {any} The bulk operations.
     */
    getBulkOps(item: any) {
        throw new Error('@services/baseImprovement.ts - getBulkOps - not implemented.');
    }

    /**
     * Performs a bulk write operation.
     * @param {any[]} bulkOps - The bulk operations to perform.
     */
    async performBulkWrite(bulkOps: any[]): Promise<void> {
        throw new Error('@services/baseImprovement.ts - performBulkWrite - not implemented.');
    }
}

export default BaseImprovement;