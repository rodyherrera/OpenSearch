import { EventEmitter } from 'events';
import Website from '@models/website';
import logger from '@utilities/logger';
import pLimit from 'p-limit';

class BaseImprovement extends EventEmitter {
    private groupSize: number;
    private concurrency: number;
    private limit: ReturnType<typeof pLimit>;

    constructor({ groupSize = 500, concurrency = 100 }: BaseImprovementOpts = {}) {
        super();
        this.groupSize = groupSize;
        this.concurrency = concurrency;
        this.limit = pLimit(this.concurrency);
    }

    async processImprovement(
        method: string,
        batchSize: number,
        totalDataSize: number,
        getDataFunc: (skip: number) => Promise<any[]>
    ): Promise<void> {
        this.emit('improvementStart', { method });

        const totalBatches = Math.ceil(totalDataSize / batchSize);
        logger.debug(
            `@processImprovement: Method (${method}), Batch Size (${batchSize}), Total Data Size (${totalDataSize}), Total Batches (${totalBatches})`
        );

        const batchIndices: number[] = Array.from({ length: totalBatches }, (_, i) => i);

        for (let i = 0; i < batchIndices.length; i += this.groupSize) {
            const currentGroup = batchIndices.slice(i, i + this.groupSize);

            const tasks = currentGroup.map(batchIndex =>
                this.limit(async () => {
                    const skip = batchIndex * batchSize;
                    const data = await getDataFunc(skip);

                    if (data.length === 0) return;

                    if (batchIndex % 100 === 0) {
                        logger.debug(`@processImprovement: Processing batch ${batchIndex + 1}/${totalBatches}`);
                    }

                    const bulkOps = data.flatMap(item => this.getBulkOps(item));
                    await this.performBulkWrite(bulkOps);

                    this.emit('batchProcessed', { method, data: bulkOps });
                })
            );

            await Promise.all(tasks);
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
    getBulkOps(item: any): any {
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
