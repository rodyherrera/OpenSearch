import { downloadDocumentsFromRegistry } from '@utilities/globalRegistry';
import { exec } from 'child_process';
import cliProgress from 'cli-progress';
import util from 'util';
import decompress from 'decompress';
import decompressTarxz from 'decompress-tarxz';
import fs from 'fs';

const asyncExec = util.promisify(exec);
const suggestFile = 'data/opensearch@suggests.json';
const websiteFile = 'data/opensearch@websites.json';
const migrationFile = 'data/opensearch@documents.tar.xz';


const downloadProgressBar = new cliProgress.SingleBar({
    format: 'opensearch@records.zip |{bar}| {percentage}% | Restantes: {remainingSizeMB} MiB',
    clearOnComplete: true,
    stopOnComplete: true
});

// Funciones
const importDocuments = async (model: string): Promise<void> => {
    try{
        const database = process.env.NODE_ENV === 'production' ? 
            process.env.PRODUCTION_DATABASE : process.env.DEVELOPMENT_DATABASE;
        const command = `mongoimport --uri "${process.env.MONGO_URI}/${database}" --collection ${model} --file "data/opensearch@${model}.json" --authenticationDatabase admin`;
        await asyncExec(command);
    }catch (error){
        console.error(`Error importing ${model}:`, error);
        throw error;
    }
};

const existsMigrationFiles = (): boolean => {
    console.log('Open Search CLI -> Verifying existence of decompressed migration files.');
    return fs.existsSync(suggestFile) && fs.existsSync(websiteFile);
};

const registryDownloadProgressHandler = (percentage: string, _: object, remainingSize: number): void => {
    const progress = parseFloat(percentage);
    const remainingSizeMB = (remainingSize / (1024 * 1024)).toFixed(2);
    downloadProgressBar.update(progress, { remainingSizeMB });
};

const unzipData = async (): Promise<void> => {
    console.log('Open Search CLI -> Extracting migration files for loading to the database...');
    const records = fs.existsSync(migrationFile);
    if(!records){
        console.log(`Open Search CLI -> The "${migrationFile}" migration file was not found.`);
        console.log('Open Search CLI -> The documents will be downloaded from the registry, be patient...');
        downloadProgressBar.start(100, 0);
        await downloadDocumentsFromRegistry(registryDownloadProgressHandler);
        downloadProgressBar.stop();
    }
    console.log('Open Search CLI -> Found migration file, extracting into the "data/" directory...');
    await decompress(migrationFile, 'data/', { plugins: [decompressTarxz()] });
    console.log('Open Search CLI -> Extraction operation completed.');
};

const importLocalData = async (): Promise<void> => {
    try{
        const migrationFilesExists = existsMigrationFiles();
        if (!migrationFilesExists) await unzipData();
        console.log('\n-->(Be patient!)<-- Loading in parallel using "mongoimport" the documents to the database, please be patient...');
        await Promise.all([
            importDocuments('suggests'),
            importDocuments('websites')
        ]);
    } catch(error){
        throw error;
    }
};

export default importLocalData;
