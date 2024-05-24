import { EventEmitter } from 'events';
import { getUniqueKeywords } from '@models/website';
import Website, { getWebsiteContent } from '@models/website';
import Suggest, { suggestionsFromContent } from '@models/suggest';

//double spaces delete

// Each improvement method will emit events related to the lifecycle 
// of its operation. Each event sends an object with the 'method'
// parameter, which indicates which improvisation method the 
// emitted event corresponds to.
class SuggestEngineImprovement extends EventEmitter{
    async contentBasedImprovement(batchSize: number = 5): Promise<any>{
        const method = 'contentBased';
        this.emit('improvementStart', { method });
        let skip = 0;
        while(true){
            const websites = await Website.aggregate([
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: batchSize },
                { $project: { _id: 0, url: 1 } }
            ]);
            if(websites.length === 0) break;
            const contentsPromise = websites.map(({ url }) => getWebsiteContent(url));
            const contents = await Promise.all(contentsPromise);
            const keywordsPromise = contents.map((content) => suggestionsFromContent(content, 5));
            const keywords = await Promise.all(keywordsPromise);
            const uniqueKeywords = Array.from(new Set(keywords.flat()));
            const bulksOps = uniqueKeywords.map((keyword) => ({
                updateOne: {
                    filter: { suggest: keyword },
                    update: { $setOnInsert: { suggest: keyword } },
                    upsert: true
                }
            }));
            await Suggest.bulkWrite(bulksOps, { ordered: false });
            this.emit('batchProcessed', { data: bulksOps, method });
            skip += batchSize;
        }
        this.emit('improvementEnd', { method });
    };

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
                updateOne: {
                    filter: { suggest: keyword },
                    update: { $setOnInsert: { suggest: keyword } },
                    upsert: true
                }
            }));
            await Suggest.bulkWrite(bulksOps, { ordered: false });
            this.emit('batchProcessed', { data: bulksOps, method });
            skip += batchSize;
        }
        this.emit('improvementEnd', { method });
    };
};

export default SuggestEngineImprovement;