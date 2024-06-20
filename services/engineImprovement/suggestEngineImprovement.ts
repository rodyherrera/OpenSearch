import BaseImprovement from '@services/engineImprovement/baseImprovement';
import WebScraper from '@services/webScraper';
import Suggest from '@models/suggest';
import PQueue from 'p-queue';
import _ from 'lodash';
import { getUniqueKeywords } from '@utilities/engines/websites';
import { suggestionsFromContent } from '@utilities/engines/suggestions';

/**
 * Class for improving suggestions search engine.
 * @extends BaseImprovement
*/
class SuggestEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;
    private suggestQueue: PQueue;

    /**
     * Creates an instance of SuggestEngineImprovement.
    */
    constructor(){
        super();
        this.webScraper = new WebScraper(this);
        this.suggestQueue = new PQueue({ concurrency: 5 });
    };

    /**
     * Performs content-based improvement of suggestions.
     * @param {number} [batchSize=5] - The number of websites to process in each batch.
     * @returns {Promise<void>} - A promise that resolves when improvement is complete.
    */
    async contentBasedImprovement(batchSize: number = 5): Promise<void>{
        const method = 'contentBased';
        const totalDocuments = await Suggest.countDocuments();
        const getDataFunc = (createdAt: 1 | -1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            const contents = await this.suggestQueue.addAll(websites.map(({ url }) => () => this.webScraper.getWebsiteContent(url)));
            const keywords = await this.suggestQueue.addAll(contents.map((content) => () => suggestionsFromContent(content, 5)));
            return _.uniq(_.flatten(keywords));
        };
        await this.processImprovement(method, batchSize, totalDocuments, getDataFunc(-1));
    };

    /**
     * Performs keyword-based improvement of suggestions.
     * @param {number} [batchSize=1] - The number of suggestions to process in each batch.
     * @returns {Promise<void>} - A promise that resolves when improvement is complete.
    */
    async keywordBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'keywordBased';
        const totalDocuments = await Suggest.countDocuments();
        const getDataFunc = (createdAt: number) => async (skip: number) => {
            const uniqueKeywords = await getUniqueKeywords([
                { $sort: { createdAt } },
                { $skip: skip },
                { $limit: batchSize }
            ]);
            return _.map(uniqueKeywords, 'keyword');
        };
        await this.processImprovement(method, batchSize, totalDocuments, getDataFunc(-1))
    };

    /**
     * Performs bulk write operations for suggestions.
     * @param {any[]} bulkOps - The array of bulk write operations.
     * @returns {Promise<void>} - A promise that resolves when bulk write is complete.
    */
    performBulkWrite(bulkOps: any[]): void {
        Suggest.bulkWrite(bulkOps, { ordered: false });
    };

    /**
     * Generates bulk write operations for suggestions.
     * @param {any} item - The suggestion data.
     * @returns {any} - The bulk write operation document.
    */
    getBulkOps(item: any): any{
        return {
            updateOne: {
                filter: { suggest: item },
                update: { $setOnInsert: { suggest: item } },
                upsert: true
            }
        };
    };
};

export default SuggestEngineImprovement;