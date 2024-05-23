import dotenv from 'dotenv';
import mongoConnector from '@utilities/mongoConnector';
import importLocalData from '@cli/actions/importLocalData';
import { select } from '@inquirer/prompts';

dotenv.config({ path: './.env' });

(async () => {
    await mongoConnector();
    const action = await select({
        message: 'Select an option',
        choices: [
            {
                name: 'Import local records to the database.',
                value: importLocalData,
                description: 'OpenSearch provides you with the necessary records to consume via API, but first you must import them into your database.'
            }
        ]
    });
    action();
})();