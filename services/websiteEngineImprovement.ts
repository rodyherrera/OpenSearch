import Suggests from '@models/suggest';
import Website from '@models/website';
import BaseImprovement from '@services/baseImprovement';
import WebScraper from '@services/webScraper';
import _ from 'lodash';

// @ts-ignore
import CDrakeSE from 'cdrake-se';

/**
 * Class for improving websites search engine.
 * @extends BaseImprovement
*/
class WebsiteEngineImprovement extends BaseImprovement{
    private webScraper: WebScraper;

    /**
     * Creates an instance of WebsiteEngineImprovement.
    */
    constructor(){
        super();
        this.webScraper = new WebScraper();
    };

    /**
     * Processes a suggest string to extract links and data.
     * @param {string} suggest - The suggest string.
     * @returns {Promise<BulkWriteDocument[]>} - A promise resolving to an array of bulk write operations.
     * @private
    */
    private async processSuggest(suggest: string): Promise<BulkWriteDocument[]>{
        const links = await this.getLinksFromSuggest(suggest);
        const scrapedWebsites = await this.scrapeLinksAndExtractData(links);
        return scrapedWebsites.map(this.getBulkOps);
    };

    /**
     * Extracts links from a suggest string using CDrakeSE.
     * @param {string} suggest - The suggest string.
     * @returns {Promise<string[]>} - A promise resolving to an array of links.
     * @private
    */
    private async getLinksFromSuggest(suggest: string): Promise<string[]>{
        try{
            const { Results: webSearch } = await CDrakeSE({ Query: suggest, Method: 'Search' });
            return _.map(webSearch, 'Link');
        }catch (error){
            return [];
        }
    };

    /**
     * Scrapes links and extracts data from websites.
     * @param {string[]} links - The array of website links.
     * @returns {Promise<BulkWriteDocument[]>} - A promise resolving to an array of bulk write operations.
     * @private
    */
    private async scrapeLinksAndExtractData(links: string[]): Promise<BulkWriteDocument[]>{
        const promises = links.map((link) => this.webScraper.scrapeSite(link));
        const results = await Promise.all(promises.map((p) => p.catch(_.noop)));
        return _.compact(results);
    };

    /**
     * Performs hyperlink-based improvement of websites.
     * @param {number} [batchSize=1] - The number of websites to process in each batch.
     * @returns {Promise<void>} - A promise that resolves when improvement is complete.
    */
    async hyperlinkBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'hyperlinkBased';
        const totalDocuments = await Website.countDocuments();
        const getDataFunc = (createdAt: -1 | 1) => async (skip: number) => {
            const websites = await this.getWebsitesFromDatabase(skip, batchSize, createdAt);
            console.log(websites.length);
            const extractedUrls = await this.webScraper.getExtractedUrls(websites);
            console.log(extractedUrls.length);
            return await this.webScraper.getScrapedWebsites(extractedUrls);
        };
        this.processImprovement(method, batchSize, totalDocuments, getDataFunc(-1))
    };

    /**
     * Performs suggest-based improvement of websites.
     * @param {number} [batchSize=1] - The number of suggestions to process in each batch.
     * @returns {Promise<void>} - A promise that resolves when improvement is complete.
    */
    async suggestsBasedImprovement(batchSize: number = 1): Promise<void>{
        const method = 'suggestsBased';
        const totalDocuments = await Website.countDocuments() / 2;
        const getDataFunc = (createdAt: -1 | 1) => async (skip: number) => {
            const suggestions = await Suggests.aggregate([
                { $sort: { createdAt } },
                { $skip: skip },
                { $limit: batchSize },
                { $project: { _id: 0, suggest: 1 } },
            ]);
            const websitesPromises = _.map(suggestions, ({ suggest }: { suggest: string }) => this.processSuggest(suggest));
            return _.flatten(await Promise.all(websitesPromises));
        };
        await Promise.all([
            this.processImprovement(method, batchSize, totalDocuments, getDataFunc(-1)),
            this.processImprovement(method, batchSize, totalDocuments, getDataFunc(1))
        ]);
    };

    /**
     * Generates bulk write operations for websites.
     * @param {any} item - The website data.
     * @returns {BulkWriteDocument} - The bulk write operation document.
    */
    getBulkOps(item: any): BulkWriteDocument{
        const { url, title, description, metaData } = item;
        return {
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { description, title, metaData, url } },
                upsert: true,
            }
        };
    };

    /**
     * Performs bulk write operations for websites.
     * @param {BulkWriteDocument[]} bulkOps - The array of bulk write operations.
     * @returns {void}
    */
    performBulkWrite(bulkOps: any[]): void{
        Website.bulkWrite(bulkOps, { ordered: false });
    };
};

/**
 * Interface representing a bulk write operation document for websites.
 * @interface
*/
interface BulkWriteDocument {
    updateOne: {
        filter: { url: string };
        update: {
            $setOnInsert: {
                // TOOD: define in another place
                description: string;
                title: string;
                url: string;
                metaData: { [key: string]: any };
            };
        };
        upsert: boolean;
    };
}

export default WebsiteEngineImprovement;