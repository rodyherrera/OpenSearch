import mongoConnector from '@utilities/mongoConnector';
import dotenv from 'dotenv';
import {
    WebsiteEngineImprovement,
    SuggestEngineImprovement,
    AssetEngineImprovement,
    ImageEngineImprovement,
    NewsEngineImprovement,
    ShoppingEngineImprovement,
} from '@services/engineImprovement';

dotenv.config({ path: './.env' });

const engines = {
    Website: new WebsiteEngineImprovement(),
    Suggest: new SuggestEngineImprovement(),
    Asset: new AssetEngineImprovement(),
    Image: new ImageEngineImprovement(),
    News: new NewsEngineImprovement(),
    Shopping: new ShoppingEngineImprovement(),
};

const improvementStartHandler = (engine, method) => {
    console.log(`${engine} Engine Improvement -> Starting using method "${method}"...`);
};

const improvementEndHandler = (engine, method) => {
    console.log(`${engine} Engine Improvement -> Finished, method "${method}".`);
};

const batchProcessedHandler = (engine, method, data) => {
    console.log(`${engine} Engine Improvement -> (${method}): ${data.length} documents processed.`);
};

Object.entries(engines).forEach(([engineName, engine]) => {
    engine.on('improvementStart', ({ method }) => improvementStartHandler(engineName, method));
    engine.on('improvementEnd', ({ method }) => improvementEndHandler(engineName, method));
    engine.on('batchProcessed', ({ method, data }) => batchProcessedHandler(engineName, method, data));
});

import scrapingTargets from '@data/scrapingTargets';

(async () => {
    await mongoConnector();
    await Promise.all([
        engines.Website.hyperlinkBasedImprovement(5, true),
        engines.Website.suggestsBasedImprovement(5),
        engines.Website.listBasedImprovement(5, [
            ...scrapingTargets.devs,
            ...scrapingTargets.news,
            ...scrapingTargets.shopping,
            ...scrapingTargets.wikipedia
        ]),
        engines.Asset.contentBasedImprovement(5),
        engines.Image.contentBasedImprovement(5),
        engines.Shopping.secureProvidersBasedImprovement(10000),
        //engines.Suggest.contentBasedImprovement(10000),
        //engines.Suggest.keywordBasedImprovement(10000)
    ]);
})();


