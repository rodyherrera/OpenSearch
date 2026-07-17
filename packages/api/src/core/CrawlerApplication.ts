import Bootstrap from '@/core/Bootstrap';
import CrawlEngine from '@/modules/fleet/services/CrawlEngine';
import WebsiteService from '@/modules/website/services/WebsiteService';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

export default class CrawlerApplication{
    #bootstrap = new Bootstrap();
    #crawler?: CrawlEngine;

    async start(): Promise<void>{
        await this.#bootstrap.initInfra();

        const workerId = process.env.HOSTNAME || `worker-${process.pid}`;
        this.#crawler = new CrawlEngine({ workerId, ...config.crawler });

        await this.#seedFrontier();

        logger.info('Crawler -> starting massive crawl loop.', { scope: 'crawler' });
        await this.#crawler!.run();
    }

    async stop(): Promise<void>{
        this.#crawler?.stop();
        await this.#bootstrap.shutdown();
    }

    async #seedFrontier(): Promise<void>{
        const frontier = this.#crawler!.getFrontier();

        const currentSize = await frontier.size();
        if(currentSize > 0){
            logger.info(`Crawler -> frontier already holds ${currentSize} URLs, skipping seed.`, { scope: 'crawler' });
            return;
        }

        const knownUrls = await new WebsiteService().recentUrls(5000);
        const seeds = [...new Set(knownUrls)];
        if(!seeds.length){
            logger.info('Crawler -> no known URLs to seed; relying on discovery sources.', { scope: 'crawler' });
            return;
        }

        await frontier.enqueue(seeds);
        logger.info(`Crawler -> seeded frontier with ${seeds.length} URLs from the index.`, { scope: 'crawler' });
    }
}
