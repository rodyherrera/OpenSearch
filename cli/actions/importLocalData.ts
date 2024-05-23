import mongoose, { AnyBulkWriteOperation } from 'mongoose';
import Suggest from '@models/suggest';
import Website from '@models/website';
import cliProgress from 'cli-progress';
import yaulz from 'yauzl-promise';
import streamPromises from 'stream/promises';
import fs from 'fs';

/**
 * Batch size for bulk write operations.
 * @type {number}
*/
const BATCH_SIZE = 25000;

/**
 * Interface for transformed data.
 * @interface
*/
interface TransformedData{
    _id?: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date,
    [key: string]: any;
};

/**
 * Transforms raw data into a format compatible with the database schema.
 * @param {any[]} data - Raw data to be transformed.
 * @returns {TransformedData[]} - Transformed data.
*/ 
const transformData = (data: any[]): TransformedData[] => {
    return data.map((item) => {
        const transformedItem: TransformedData = { ...item };
        if(item._id && item._id.$oid){
            transformedItem._id = new mongoose.Types.ObjectId(item._id.$oid);
        }
        if(item.createdAt && item.createdAt.$date){
            transformedItem.createdAt = new Date(item.createdAt.$date);
        }
        if(item.updatedAt && item.updatedAt.$date){
            transformedItem.updatedAt = new Date(item.updatedAt.$date);
        }
        return transformedItem;
    });
};

/**
 * Creates bulk write operations for the transformed data.
 * @param {TransformedData[]} data - Transformed data.
 * @returns {AnyBulkWriteOperation<TransformedData>[]} - Bulk write operations.
*/
const createBulkWriteOperations = (data: TransformedData[]): AnyBulkWriteOperation<TransformedData>[] => {
    return data.map((item) => ({
        insertOne: { document: item }
    }));
};

/**
 * Splits an array of operations into batches of specified size.
 * @template T
 * @param {T[]} operations - Array of operations.
 * @param {number} batchSize - Size of each batch.
 * @returns {T[][]} - Array of operation batches.
*/
const splitIntoBatches = <T>(operations: T[], batchSize: number): T[][] => {
    const batches: T[][] = [];
    for(let i = 0; i < operations.length; i += batchSize){
        batches.push(operations.slice(i, i + batchSize));
    }
    return batches;
};

/**
 * Reads and parses data from a JSON file.
 * @param {string} model - Name of the model.
 * @returns {object[]} - Parsed data.
*/
const readAndParseData = (model: string): object[] => {
    const data = JSON.parse(fs.readFileSync(`data/opensearch@${model}.json`, 'utf-8'));
    return data;
};

const existsMigrationFiles = (): boolean => {
    console.log('Open Search CLI -> Verifying existence of decompressed migration files.');
    const suggestFile = 'data/opensearch@suggest.json';
    const websiteFile = 'data/opensearch@website.json';
    return fs.existsSync(suggestFile) && fs.existsSync(websiteFile);
};

const unzipData = async (): Promise<any> => {
    console.log('Open Search CLI -> Extracting migration files for loading to the database...');
    const migrationFile = 'data/opensearch@records.zip';
    const records = fs.existsSync(migrationFile);
    if(!records){
        console.error(`Open Search CLI -> The "${migrationFile}" migration file was not found.`);
        process.exit(0);
    }
    console.log('Open Search CLI -> Found migration file, extracting into the "data/" directory...');
    const zip = await yaulz.open(migrationFile);
    try{
        for await(const entry of zip){
            if(entry.filename.endsWith('/')){
                await fs.promises.mkdir(`data/${entry.filename}`);
            }else{
                const readStream = await entry.openReadStream();
                const writeStream = fs.createWriteStream(`data/${entry.filename}`);
                await streamPromises.pipeline(readStream, writeStream);
            }
        }
    }finally{
        await zip.close();
        console.log('Open Search CLI -> Extraction operation completed.');
    }
};

/**
 * Imports local data into the database.
 * @returns {Promise<void>} - Promise indicating the completion of the import process.
*/
const importLocalData = async (): Promise<void> => {
    const migrationFilesExists = existsMigrationFiles();
    if(!migrationFilesExists) await unzipData();

    console.log('Open Search CLI -> Setting up indexed local websites...');
    const storedWebsites = readAndParseData('website');
    console.log('Open Search CLI -> Reading the local model documents for suggestions...');
    const storedSuggests = readAndParseData('suggest');
    
    console.log('Open Search CLI -> Preparing data for import...');
    const suggestOperations = createBulkWriteOperations(transformData(storedSuggests));
    const websiteOperations = createBulkWriteOperations(transformData(storedWebsites));

    console.log('Open Search CLI -> Splitting operations into batches...');
    const suggestBatches = splitIntoBatches(suggestOperations, BATCH_SIZE);
    const websiteBatches = splitIntoBatches(websiteOperations, BATCH_SIZE);

    console.log('Open Search CLI -> Importing the documents in batches to the database...');
    console.log('Open Search CLI -> NOTE: This is a one-time process, however it will take a little time, as the volume of data is large and is being handled efficiently.');

    try{
        const suggestBar = new cliProgress.SingleBar({
            format: 'Open Search CLI -> (Suggestions) [{bar}] {percentage}% | {value}/{total}',
            clearOnComplete: true,
            stopOnComplete: true
        });
    
        suggestBar.start(suggestBatches.length, 0);
    
        for(const batch of suggestBatches){
            await Suggest.bulkWrite(batch, { ordered: false });
            suggestBar.increment();
        }
    
        const websiteBar = new cliProgress.SingleBar({
            format: 'Open Search CLI -> (Websites) [{bar}] {percentage}% | {value}/{total}',
            clearOnComplete: true,
            stopOnComplete: true,
        });
    
        websiteBar.start(websiteBatches.length, 0);
      
        for(const batch of websiteBatches){
            await Website.bulkWrite(batch, { ordered: false });
            websiteBar.increment();
        }
      
        console.log('Open Search CLI -> Documents imported into the database successfully!');
    }catch(error){
        console.error('Open Search CLI -> Oops, something happened when trying to import the logs:', error);
    }
};

export default importLocalData;