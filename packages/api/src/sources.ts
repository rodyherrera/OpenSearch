import 'dotenv/config';

import SourcesApplication from '@/core/SourcesApplication';
import { logger } from '@/core/utils/Logger';

const app = new SourcesApplication();
let shuttingDown = false;

const shutdown = async (code: number): Promise<void> => {
    if(shuttingDown) return;
    shuttingDown = true;
    await app.stop();
    process.exit(code);
};

app.start().catch((error) => {
    logger.error('Failed to start sources', error);
    void shutdown(1);
});

for(const signal of ['SIGTERM', 'SIGINT'] as const){
    process.on(signal, () => { void shutdown(0); });
}
