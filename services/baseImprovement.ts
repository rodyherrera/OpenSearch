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
        let shouldContinue = true;
        while(shouldContinue){
            const data = await getDataFunc(skip);
            if(data.length === 0){
                shouldContinue = false;
                break;
            }
            const bulkOps = data.map(this.getBulkOps);
            await this.performBulkWrite(bulkOps);
            this.emit('batchProcessed', { data: bulkOps, method });
            skip += batchSize;
        }
        this.emit('improvementEnd');
    };

    // Shared function in suggestEngineImprovement.ts & websiteEngineImprovement.ts
    async getWebsitesFromDatabase(skip: number, limit: number, createdAt: -1 | 1): Promise<{ url: string }[]>{
        return await Website.aggregate([
            { $sort: { createdAt } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, url: 1 } }
        ]);
    };

    getBulkOps(item: any){
        throw new Error('@services/baseImprovement.ts - getBulkOps - not implemented.');
    };

    performBulkWrite(bulkOps: any[]): void{
        throw new Error('@services/baseImprovement.ts - performBulkWrite - not implemented.');
    };
};

export default BaseImprovement;