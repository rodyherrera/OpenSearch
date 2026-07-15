import { getRedisSubscriber } from '@/shared/redis/RedisClient';
import { CRAWL_CHANNEL } from '@/modules/crawler/contracts/domain/events';
import { logger } from '@/core/utils/Logger';

export default class CrawlRelayService{
    async start(onEvent: (raw: string) => void): Promise<void>{
        const sub = await getRedisSubscriber();
        await sub.subscribe(CRAWL_CHANNEL, onEvent);
        logger.info(`Realtime relay subscribed to "${CRAWL_CHANNEL}"`, { scope: 'ws' });
    }
}
