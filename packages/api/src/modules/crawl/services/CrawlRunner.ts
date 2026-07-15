import pLimit from 'p-limit';
import { logger } from '@/core/utils/Logger';
import { normalizeUrl, domainOf } from '@/modules/crawler/services/CrawlFrontier';
import PageFetcher from '@/modules/extraction/services/PageFetcher';
import PageParser from '@/modules/extraction/services/PageParser';
import WebsiteService from '@/modules/website/services/WebsiteService';
import CrawlJob, { type CrawlJobDocument } from '@/modules/crawl/models/CrawlJob';
import WebhookNotifier from '@/modules/crawl/services/WebhookNotifier';

const CONCURRENCY = 4;
// Re-read the job's status from Mongo every this many pages to honour cancellation
// without querying on every single fetch.
const CANCEL_CHECK_EVERY = CONCURRENCY;

interface ScrapedNode{
    url: string;
    links: string[];
}

// Runs one bounded, single-domain crawl in-process: a breadth-first walk from the
// start URL that scrapes each page (storing markdown in the shared index) and follows
// only same-domain links until the page cap is hit. Isolated from the global massive
// crawl frontier so job crawls stay independent and predictable.
export default class CrawlRunner{
    #fetcher = new PageFetcher();
    #parser = new PageParser();
    #websites = new WebsiteService();
    #webhook = new WebhookNotifier();

    // Kicked off fire-and-forget by the controller; owns the job's lifecycle from
    // 'running' to a terminal state and never throws to its caller.
    async run(jobId: string): Promise<void>{
        const job = await CrawlJob.findById(jobId);
        if(!job) return;

        job.status = 'running';
        job.startedAt = new Date();
        await job.save();

        const scraped: string[] = [];
        try{
            const cancelled = await this.#walk(job, scraped);
            await this.#finish(job, scraped, cancelled ? 'cancelled' : 'completed');
        }catch(error){
            logger.error(`crawl job ${jobId} failed`, error, { scope: 'crawl' });
            job.error = error instanceof Error ? error.message : 'crawl failed';
            await this.#finish(job, scraped, 'failed');
        }
    }

    // Returns true if the job was cancelled mid-walk.
    async #walk(job: CrawlJobDocument, scraped: string[]): Promise<boolean>{
        const limit = pLimit(CONCURRENCY);
        const start = normalizeUrl(job.url);
        if(!start) return false;

        const visited = new Set<string>([start]);
        let queue: string[] = [start];

        while(queue.length && scraped.length < job.limit){
            if(scraped.length % CANCEL_CHECK_EVERY === 0 && await this.#isCancelled(job.id)){
                return true;
            }

            const batch = queue.splice(0, CONCURRENCY);
            const nodes = await Promise.all(batch.map((url) => limit(() => this.#scrapeOne(url, job))));

            const nextQueue: string[] = [];
            for(const node of nodes){
                if(!node) continue;
                scraped.push(node.url);
                if(scraped.length >= job.limit) break;
                for(const link of node.links){
                    if(visited.has(link) || domainOf(link) !== job.domain) continue;
                    visited.add(link);
                    nextQueue.push(link);
                }
            }
            queue = [...queue, ...nextQueue];
            await CrawlJob.updateOne({ _id: job.id }, { $set: { total: scraped.length } });
        }
        return false;
    }

    async #scrapeOne(url: string, job: CrawlJobDocument): Promise<ScrapedNode | null>{
        const html = await this.#fetcher.fetch(url, { respectRobots: job.respectRobots });
        if(!html) return null;
        const page = this.#parser.parse(html, url, { withMarkdown: true });
        if(!page.title) return null;
        await this.#websites.saveScraped({
            url: page.url,
            title: page.title,
            description: page.description,
            keywords: page.keywords,
            content: page.content,
            markdown: page.markdown ?? '',
            metaData: page.metaData
        });
        return { url: page.url, links: page.links };
    }

    async #isCancelled(jobId: string): Promise<boolean>{
        const fresh = await CrawlJob.findById(jobId).select('status').lean<{ status: string }>();
        return fresh?.status === 'cancelled';
    }

    async #finish(job: CrawlJobDocument, scraped: string[], status: CrawlJobDocument['status']): Promise<void>{
        await CrawlJob.updateOne({ _id: job.id }, {
            $set: {
                status,
                pages: scraped,
                total: scraped.length,
                completedAt: new Date(),
                ...(job.error ? { error: job.error } : {})
            }
        });
        if(job.webhookUrl){
            void this.#webhook.notify(job.webhookUrl, `crawl.${status}`, {
                id: String(job.id),
                url: job.url,
                status,
                total: scraped.length
            });
        }
    }
}
