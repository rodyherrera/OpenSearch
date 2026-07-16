import 'dotenv/config';

import mongoose from 'mongoose';
import Bootstrap from '@/core/Bootstrap';
import SearchIndexService, { type WebsiteLean } from '@/modules/search/services/SearchIndexService';
import Website from '@/modules/website/models/Website';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

const bootstrap = new Bootstrap();
let stopping = false;

const run = async (): Promise<void> => {
    await bootstrap.initInfra();
    const searchIndex = new SearchIndexService();
    await searchIndex.ensureIndex();

    const batchSize = config.search.meili.batchSize;
    const maxDocs = parseInt(process.env.REINDEX_MAX ?? '0', 10) || 0;
    const sinceId = process.env.REINDEX_SINCE_ID;
    let last: mongoose.Types.ObjectId | null = sinceId && mongoose.isValidObjectId(sinceId)
        ? new mongoose.Types.ObjectId(sinceId)
        : null;

    let total = 0;
    let batchCount = 0;
    while(!stopping){
        const filter: Record<string, unknown> = {};
        if(last) filter._id = { $gt: last };
        const docs = await Website.find(filter)
            .select('-markdown')
            .sort({ _id: 1 })
            .limit(batchSize)
            .lean<WebsiteLean[]>();
        if(!docs.length) break;

        await searchIndex.indexMongoDocs(docs);
        last = docs[docs.length - 1]._id;
        total += docs.length;
        batchCount++;
        logger.info(`Reindex -> ${total} document(s) queued (last _id ${last}).`, { scope: 'meili' });

        if(batchCount % 10 === 0){
            while(!stopping && (await searchIndex.pendingTasks()) > 20){
                logger.info('Reindex -> throttling, waiting for Meili task queue to drain.', { scope: 'meili' });
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        if(docs.length < batchSize) break;
        if(maxDocs && total >= maxDocs) break;
    }

    logger.info(`Reindex -> done, ${total} document(s) processed.`, { scope: 'meili' });
    await bootstrap.shutdown();
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        logger.error('Reindex failed', error);
        process.exit(1);
    });

for(const signal of ['SIGTERM', 'SIGINT'] as const){
    process.on(signal, () => { stopping = true; });
}
