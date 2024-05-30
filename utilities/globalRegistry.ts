import Downloader from 'nodejs-file-downloader';
import fs from 'fs';
import path from 'path';

const ensureDirectoryExists = (directory: string): void => {
    if(!fs.existsSync(directory)){
        fs.mkdirSync(directory, { recursive: true });
    }
};

export const downloadDocumentsFromRegistry = async (
    onProgress: (percentage: string, chunk: object, remainingSize: number) => void
): Promise<void> => {
    const url = 'http://registry.opensearch.rodyherrera.com/opensearch@documents.tar.xz';
    const directory = path.join('data/');

    ensureDirectoryExists(directory);
    const downloader = new Downloader({
        url,
        directory,
        onProgress
    });
    try{
        await downloader.download();
    }catch(error){
        throw new Error('Failed to download documents from registry.');
    }
};
