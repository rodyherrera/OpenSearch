import 'dotenv/config';

import HttpApplication from '@/core/HttpApplication';
import { logger } from '@/core/utils/Logger';

const app = new HttpApplication();

app.start().catch((err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
});

for(const signal of ['SIGTERM', 'SIGINT'] as const){
    process.on(signal, () => {
        app.stop().finally(() => process.exit(0));
    });
}
