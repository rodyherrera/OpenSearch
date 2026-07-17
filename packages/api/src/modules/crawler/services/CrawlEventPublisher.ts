import { getRedis } from '@/shared/redis/RedisClient';
import { logger } from '@/core/utils/Logger';
import { CRAWL_CHANNEL } from '@/modules/crawler/contracts/domain/events';
import type { CrawlEvent, WorkspacePageRow, RemovedRef } from '@/modules/crawler/contracts/domain/events';
import type { PublicSeed } from '@/modules/seed/contracts/domain/seed';

export default class CrawlEventPublisher{
    async publishCrawlEvent(event: CrawlEvent): Promise<void>{
        try{
            const redis = await getRedis();
            await redis.publish(CRAWL_CHANNEL, JSON.stringify(event));
        }catch(error){
            logger.debug(`publishCrawlEvent failed: ${error}`);
        }
    }

    publishPageEvent(worker: string, url: string, title: string, domain: string, links: string[], at: number): Promise<void>{
        return this.publishCrawlEvent({ type: 'page', worker, url, title, domain, links, at });
    }

    publishControlEvent(paused: boolean, at: number): Promise<void>{
        return this.publishCrawlEvent({ type: 'control', paused, at });
    }

    publishChangeEvent(workspaceId: string, urls: string[], at: number): Promise<void>{
        return this.publishCrawlEvent({ type: 'change', workspaceId, urls, count: urls.length, at });
    }

    async publishWorkspacePages(workspaceId: string, pages: WorkspacePageRow[], at: number): Promise<void>{
        if(!pages.length) return;
        await this.publishCrawlEvent({ type: 'ws:page', workspaceId, pages, at });
    }

    async publishSeedAdded(workspaceId: string, seeds: PublicSeed[], at: number): Promise<void>{
        if(!seeds.length) return;
        await this.publishCrawlEvent({ type: 'ws:seed', workspaceId, seeds, at });
    }

    publishRemoved(workspaceId: string, kind: 'page' | 'seed' | 'domain', payload: RemovedRef, at: number): Promise<void>{
        return this.publishCrawlEvent({ type: 'ws:removed', workspaceId, kind, ...payload, at });
    }
}
