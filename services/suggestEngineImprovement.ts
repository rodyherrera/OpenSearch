import { EventEmitter } from 'events';
import { getUniqueKeywords } from '@models/website';
import Suggest from '@models/suggest';

// Each improvement method will emit events related to the lifecycle 
// of its operation. Each event sends an object with the 'method'
// parameter, which indicates which improvisation method the 
// emitted event corresponds to.
class SuggestEngineImprovement extends EventEmitter{
    async keywordBasedImprovement(batchSize: number = 1000): Promise<any>{
        const method = 'keywordBased';
        this.emit('improvementStart', { method });
        let skip = 0;
        // An iteration will be carried out until all records are processed.
        while(true){
            // We use the latest records of indexed websites, because in this 
            // way we obtain new keywords as the site search engine also receives 
            // feedback. Otherwise, we would always obtain data that 
            // is already in the database.
            const uniqueKeywords = await getUniqueKeywords([
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: batchSize }
            ]);
            if(uniqueKeywords.length === 0) break;
            const bulksOps = uniqueKeywords.map(({ keyword }) => ({
                insertOne: { document: { suggest: keyword } }
            }));
            await Suggest.bulkWrite(bulksOps, { ordered: false });
            this.emit('batchProcessed', { data: bulksOps });
            skip += batchSize;
        }
        this.emit('improvementEnd', { method });
    };
};

export default SuggestEngineImprovement;