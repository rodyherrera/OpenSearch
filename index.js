import dotenv from 'dotenv';
import axios from 'axios';
import cheerio from 'cheerio';
import searchEngine from 'cdrake-se';
import fs from 'fs/promises';
import readline from 'node:readline';
dotenv.config({ path: './.env' });

import mongoConnector from './utilities/mongoConnector.js';
import Website, { searchWebsite } from './models/website.js';
import Suggest, { searchSuggest } from './models/suggest.js';

let wordSet = new Set();
const suggests = [];
const websites = new Map();

const BASE_URL = 'https://en.wikipedia.org/wiki/Database';
const AXIOS_OPTS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
};

const fetchHTML = async (url) => {
    try{
        const response = await axios.get(url, AXIOS_OPTS);
        return response.data;
    }catch(error){
        console.log(`OpenWebBot -> Error fetching HTML for ${url}, "${error}".`);
        return '';
    }
};

const scrapeWebContent = async (url) => {
    const data = await fetchHTML(url);
    const $ = cheerio.load(data);
    const content = $('body').text();
    const words = content.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().split(/\s+/);
    return new Set(words);
};

const extractMetaData = (html) => {
    const $ = cheerio.load(html);
    const title = $('head > title').text().trim();
    const metaData = {};
    $('meta').each((_, element) => {
        const name = $(element).attr('name');
        const property = $(element).attr('property');
        const content = $(element).attr('content');
        if(!content) return;
        if(name){
            metaData[name] = content;
        }else if(property){
            metaData[property] = content;
        }
    });
    const description = metaData?.description;
    if(!title || !description) return null;
    return { title, description, ...metaData };
};

const scrapeSite = async (url) => {
    try{
        const html = await fetchHTML(url);
        const data = extractMetaData(html);
        if(!data?.title || data === null) return null;
        return { url, ...data };
    }catch(error){
        console.log(`OpenWebBot -> Error crawling website "${url}": ${error.message}`);
        return null;
    }
};

const processLinkScrape = async (link) => {
    try{
        const metaData = await scrapeSite(link);
        console.log(`OpenWebBot -> Link "${link}" processed.`);
        if(metaData === null) return;
        websites.set(link, metaData);
    }catch(error){
        console.log(`OpenWebBot -> Error processing link scrape: ${error.message}`);
    }
};

const processWordSuggest = async (suggest, word) => {
    try{
        console.log(`OpenWebBot -> processing "${suggest}" for the word "${word}".`);
        const searchResults = (await searchEngine({ 
            Query: suggest, 
            Method: 'Search' })).Results;
        const links = searchResults.map(({ Link }) => Link);
        console.log(`OpenWebBot -> ${links.length} websites found for the suggestion "${suggest}".`);
        const promises = [];
        for(const link of links){
            promises.push(processLinkScrape(link));
        }
        await Promise.all(promises);
    }catch(error){
        console.log(`OpenWebBot -> Error processing word suggest: ${error.message}`);
    }
};

const processWord = async (word) => {
    try{
        console.log(`OpenWebBot -> processing word "${word}", waiting for suggestions...`);
        const wordSuggests = (await searchEngine({ 
            Query: word, 
            Method: 'Suggest' })).Results;
        console.log(`OpenWebBot -> ${wordSuggests.length} suggestions were found, processing...`);
        const promises = [];
        for(const suggest of wordSuggests){
            promises.push(processWordSuggest(suggest, word));
        }
        suggests.push(...wordSuggests);
        await Promise.all(promises);
    }catch(error){
        console.log(`OpenWebBot -> Error processing word: ${error.message}`);
    }
};

const performBulkWrite = async (map) => {
    try{
        const operations = mapToOperations(map);
        if(operations.length === 0){
            console.log(`OpenWebBot -> There is not operations to do.`);
            return;
        }
        await Website.bulkWrite(operations);
        console.log(`OpenWebBot -> bulkWrite completed.`);
    }catch(error){
        console.log(`OpenWebBot -> Error in bulkWrite:`, error);
    }
};

const mapToOperations = (map) => {
    const operations = [];
    for(const [url, metaData] of map.entries()){
        const { description, title } = metaData;
        delete metaData.description;
        delete metaData.title;
        operations.push({
            updateOne: {
                filter: { url: url }, // Filtro para buscar el documento existente por URL
                update: { 
                    $setOnInsert: { // Define qué campos se deben insertar si el documento no existe
                        title: title,
                        description: description,
                        metaData: metaData
                    }
                },
                upsert: true // Indica que se debe insertar un nuevo documento si no se encuentra ninguno que coincida con el filtro
            }
        });
    }
    return operations;
};

const storeSuggestionsInDatabase = async () => {
    console.log(`OpenWebBot -> Processing ${suggests.length} suggestions to store them in the database.`);
    const operations = [];
    for(const suggest of suggests){
        operations.push({
            insertOne: { document: { suggest } }
        });
    }
    await Suggest.bulkWrite(operations);
    console.log(`OpenWebBot -> Suggestions bulkWrite completed.`);
};

/*


const BATCH_SIZE = 10;

(async () => {



    console.log(`OpenWebBot -> Starting...`);
    await mongoConnector();
    if(!wordSet.size) wordSet = await scrapeWebContent(BASE_URL);
    console.log(`OpenWebBot -> WordSet OK, working with ${wordSet.size} words.`);
    const wordSetArray = Array.from(wordSet);
    const batchedWordSets = [];
    for(let i = 0; i < wordSetArray.length; i += 20){
        batchedWordSets.push(wordSetArray.slice(i, i + 20));
    }
    console.log(`OpenWebBot -> Tasks in ${batchedWordSets.length} batches.`);
    for(const batch of batchedWordSets){
        const promises = [];
        for(const word of batch){
            promises.push(processWord(word));
        } 
        await Promise.all(promises);
        console.log(`OpenWebBot -> Word processing completed, ${websites.size} sites found.`);
        const operations = [
            storeSuggestionsInDatabase(),
            performBulkWrite(websites)
        ];
        await Promise.all(operations);
        websites.clear();
        suggests.length = 0;
    }
    console.log(`OpenWebBot -> Word processing completed.`);
    const urls = new Set();

    const processWebsiteLink = async (url) => {
        try{
            const { data } = await axios.get(url);
            const urlRegex = /href\s*=\s*['"]([^'"]+)['"]/gi;
            let match;
            while ((match = urlRegex.exec(data)) !== null) {
                const url = match[1];
                if ((url.startsWith('http://') || url.startsWith('https://'))){
                    urls.add(url);
                }
            }
        }catch(e){}
    };
    console.log('Connected to MongoDB.');
    console.log('reading');
    
    const promises = [];
    for (const url of localUrls) {
        promises.push(processWebsiteLink(url));
    }
    console.log('Ok:', promises.length);
    await Promise.all(promises);
    console.log('now with urls')
    promises.length = 0;
    urls.forEach((value) => promises.push(processLinkScrape(value)));
    await Promise.all(promises);
    console.log('Process finished.');
    await performBulkWrite(websites)
    websites.clear();

*/



(async () => {
    await mongoConnector();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const x = async () => {
        return new Promise((resolve) => {
            rl.question(`>`, async (searchTerm) => {
                console.clear();
                const response = await searchWebsite(searchTerm);
                console.log(response);
                resolve();
            });
        });
    };
    while(true){
        await x();
    }

})();