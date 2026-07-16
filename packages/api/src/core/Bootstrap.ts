import MongoDataSource from '@/core/DataSource';
import { config } from '@/shared/config';
import { logger, type LogLevel } from '@/core/utils/Logger';
import { getRedis, closeRedis } from '@/shared/redis/RedisClient';
import { getMeili, closeMeili } from '@/shared/meili/MeilisearchClient';

export default class Bootstrap{
    #dataSource = new MongoDataSource();

    async initInfra(): Promise<void>{
        logger.configure({ level: config.log.level as LogLevel, pretty: config.log.pretty });
        await this.#dataSource.initialize();
        await getRedis();
        getMeili();
    }

    async shutdown(): Promise<void>{
        await this.#dataSource.destroy();
        await closeRedis();
        await closeMeili();
    }
}
