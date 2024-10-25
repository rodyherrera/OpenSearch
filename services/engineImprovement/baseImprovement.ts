import { EventEmitter } from 'events';
import Website from '@models/website';
import PQueue from 'p-queue';
import _ from 'lodash';

export interface baseImprovementOpts{
    groupSize?: number,
    concurrency?: number
};

/**
 * A base class for improvements.
 */
class BaseImprovement extends EventEmitter{
    private queue: PQueue;
    private groupSize: number;

    constructor({ groupSize = 20, concurrency = 100 }: baseImprovementOpts = {}){
        super();
        this.groupSize = groupSize;
        this.queue = new PQueue({ concurrency });
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
        getDataFunc: (skip: number) => Promise<any[]>,
    ): Promise<void> {
        this.emit('improvementStart', { method });
        const totalBatches = Math.ceil(totalDataSize / batchSize);
        const totalGroups = Math.ceil(totalBatches / this.groupSize);
        for(let group = 0; group < totalGroups; group++){
            const tasks = [];
            for(let i = group * this.groupSize; i < Math.min((group + 1) * this.groupSize, totalBatches); i++){
                const skip = i * batchSize;
                const task = async () => {
                    const data = await getDataFunc(skip);
                    const bulkOps = _.flatMap(data, this.getBulkOps.bind(this));
                    await this.performBulkWrite(bulkOps);
                    this.emit('batchProcessed', { method, data: bulkOps });
                };
                tasks.push(this.queue.add(task));
            }
            await Promise.all(tasks);
        }
        await this.queue.onIdle();
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
    performBulkWrite(bulkOps: any[]): void{
        throw new Error('@services/baseImprovement.ts - performBulkWrite - not implemented.');
    }
}

export default BaseImprovement;