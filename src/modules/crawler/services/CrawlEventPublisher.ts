import { getRedis } from '@/shared/redis/RedisClient';
import { logger } from '@/core/utils/Logger';
import { CRAWL_CHANNEL } from '@/modules/crawler/contracts/domain/events';
import type { CrawlEvent } from '@/modules/crawler/contracts/domain/events';

export const publishCrawlEvent = async (event: CrawlEvent): Promise<void> => {
    try{
        const redis = await getRedis();
        await redis.publish(CRAWL_CHANNEL, JSON.stringify(event));
    }catch(error){
        logger.debug(`publishCrawlEvent failed: ${error}`);
    }
};

export const publishPageEvent = async (
    worker: string,
    url: string,
    title: string,
    domain: string,
    links: string[],
    at: number
): Promise<void> => {
    await publishCrawlEvent({ type: 'page', worker, url, title, domain, links, at });
};
