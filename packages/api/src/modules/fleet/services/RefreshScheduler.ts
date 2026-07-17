import { type Types } from 'mongoose';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import CrawlFrontier from '@/modules/fleet/services/CrawlFrontier';
import Workspace from '@/modules/workspace/models/Workspace';
import Seed from '@/modules/seed/models/Seed';
import Website from '@/modules/website/models/Website';

export default class RefreshScheduler{
    #frontier = new CrawlFrontier();
    #timer: ReturnType<typeof setTimeout> | null = null;
    #running = false;

    start(): void{
        if(!config.refresh.enabled){
            logger.info('Refresh -> disabled.');
            return;
        }
        this.#schedule();
        logger.info(`Refresh -> continuous re-crawl every ${Math.round(config.refresh.intervalMs / 1000)}s.`);
    }

    stop(): void{
        if(this.#timer) clearTimeout(this.#timer);
        this.#timer = null;
    }

    #schedule(): void{
        this.#timer = setTimeout(() => { void this.#run(); }, config.refresh.intervalMs);
    }

    async #run(): Promise<void>{
        if(this.#running){
            this.#schedule();
            return;
        }
        this.#running = true;
        try{
            const enqueued = await this.tick();
            if(enqueued) logger.info(`Refresh -> re-queued ${enqueued} page(s) across workspaces for freshness.`);
        }catch(error){
            logger.warn('Refresh -> tick failed', { error: String(error) });
        }finally{
            this.#running = false;
            this.#schedule();
        }
    }

    async tick(): Promise<number>{
        const workspaces = await Workspace.find().select('_id').lean<Array<{ _id: Types.ObjectId }>>();
        let total = 0;
        for(const workspace of workspaces){
            const workspaceId = String(workspace._id);
            if((await this.#frontier.workspaceQueueLength(workspaceId)) > config.refresh.batchPerWorkspace) continue;

            const [seeds, owned] = await Promise.all([
                Seed.find({ workspaceId: workspace._id })
                    .select('url')
                    .limit(config.refresh.maxSeedsPerWorkspace)
                    .lean<Array<{ url: string }>>(),
                Website.find({ workspaces: workspace._id })
                    .select('url')
                    .sort({ lastCheckedAt: 1 })
                    .limit(config.refresh.batchPerWorkspace)
                    .lean<Array<{ url: string }>>()
            ]);

            const urls = [...new Set([...seeds.map((seed) => seed.url), ...owned.map((doc) => doc.url)])];
            if(urls.length) total += await this.#frontier.forceEnqueue(urls, workspaceId);
        }
        return total;
    }
}
