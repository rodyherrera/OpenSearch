import { EventEmitter } from 'events';
import Website from '@models/website';

class BaseImprovement extends EventEmitter{
    async processImprovement(
        method: string,
        batchSize: number,
        getDataFunc: (skip: number) => Promise<any[]>,
    ): Promise<void>{
        this.emit('improvementStart', { method });
        let skip = 0;
        while(true){
            const data = await getDataFunc(skip);
            if(data.length === 0) break;
            const bulkOps = data.map(this.getBulkOps);
            await this.performBulkWrite(bulkOps);
            this.emit('batchProcessed', { data: bulkOps, method });
            skip += batchSize;
        }
        this.emit('improvementEnd', { method });
    };

    // Shared function in suggestEngineImprovement.ts & websiteEngineImprovement.ts
    async getWebsitesFromDatabase(skip: number, limit: number): Promise<{ url: string }[]>{
        return await Website.aggregate([
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, url: 1 } }
        ]);
    };

    getBulkOps(item: any){
        throw new Error('@services/baseImprovement.ts - getBulkOps - not implemented.');
    };

    async performBulkWrite(bulkOps: any[]): Promise<void>{
        throw new Error('@services/baseImprovement.ts - performBulkWrite - not implemented.');
    };
};

export default BaseImprovement;