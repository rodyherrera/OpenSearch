import 'dotenv/config';

import CrawlerApplication from '@/core/CrawlerApplication';
import { logger } from '@/core/utils/Logger';

const app = new CrawlerApplication();
let shuttingDown = false;

const shutdown = async (code: number): Promise<void> => {
    if(shuttingDown) return;
    shuttingDown = true;
    await app.stop();
    process.exit(code);
};

app.start()
    .then(() => shutdown(0))
    .catch((err) => {
        logger.error('Failed to start crawler', err);
        void shutdown(1);
    });

for(const signal of ['SIGTERM', 'SIGINT'] as const){
    process.on(signal, () => { void shutdown(0); });
}
