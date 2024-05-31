import { EventEmitter } from 'events';
import Website from '@models/website';

class BaseImprovement extends EventEmitter{
    async processImprovement(
        method: string,
        batchSize: number,
        getDataFunc: (skip: number) => Promise<any[]>,
    ): Promise<void>{
        const promises = [];
        let shouldContinue = true;
        this.emit('improvementStart', { method });

        const handleImprovement = async (skip: number) => {
            const data = await getDataFunc(skip);
            if(data.length === 0){
                shouldContinue = false;
            }
            const bulkOps = data.map(this.getBulkOps);
            await this.performBulkWrite(bulkOps);
            this.emit('batchProcessed', { data: bulkOps, method });
        };

        let skip = 0;
        let i = batchSize / 2;
        while(shouldContinue){
            if(i >= batchSize){
                i = batchSize / 2;
                await Promise.all(promises);
            }else{
                i++;
            }
            promises.push(handleImprovement(skip));
            skip += batchSize;
        }

        this.emit('improvementEnd');
    };

    // Shared function in suggestEngineImprovement.ts & websiteEngineImprovement.ts
    async getWebsitesFromDatabase(skip: number, limit: number): Promise<{ url: string }[]>{
        return await Website.aggregate([
            { $sort: { createdAt: 1 } },
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