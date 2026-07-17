import mongoose from 'mongoose';
import RuntimeError from '@/shared/errors/RuntimeError';
import { logger } from '@/core/utils/Logger';
import UrlNormalizer from '@/modules/fleet/services/UrlNormalizer';
import WebsiteService from '@/modules/website/services/WebsiteService';
import CrawlJob, { type CrawlJobDocument } from '@/modules/crawl/models/CrawlJob';
import CrawlRunner from '@/modules/crawl/services/CrawlRunner';
import { CrawlError } from '@/modules/crawl/contracts/domain/errors';
import type {
    CreateCrawlBody,
    CrawlJobStatusView,
    CrawlResultsView,
    CrawlResultPage
} from '@/modules/crawl/contracts/domain/crawl';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const RESULTS_PAGE_SIZE = 50;

export default class CrawlJobService{
    #websites = new WebsiteService();

    async create(body: CreateCrawlBody, owner: string): Promise<CrawlJobStatusView>{
        const url = UrlNormalizer.normalizeUrl(body.url ?? '');
        if(!url) throw new RuntimeError(CrawlError.InvalidUrl, 400);
        const domain = UrlNormalizer.domainOf(url);
        if(!domain) throw new RuntimeError(CrawlError.InvalidUrl, 400);

        const limit = Math.min(Math.max(body.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
        const job = await CrawlJob.create({
            url,
            domain,
            limit,
            respectRobots: body.respectRobots === true,
            webhookUrl: body.webhookUrl?.trim() || undefined,
            owner
        });

        void new CrawlRunner().run(String(job._id)).catch((error) => {
            logger.error('crawl runner crashed', error, { scope: 'crawl' });
        });

        return this.#toStatus(job);
    }

    async getStatus(id: string): Promise<CrawlJobStatusView>{
        const job = await this.#findOrThrow(id);
        return this.#toStatus(job);
    }

    async getResults(id: string, page?: string): Promise<CrawlResultsView>{
        const job = await this.#findOrThrow(id);
        const safePage = Math.max(parseInt(page ?? '', 10) || 1, 1);
        const start = (safePage - 1) * RESULTS_PAGE_SIZE;
        const slice = job.pages.slice(start, start + RESULTS_PAGE_SIZE);

        const data = await Promise.all(slice.map((url) => this.#pageResult(url)));
        return {
            id: String(job._id),
            status: job.status,
            total: job.pages.length,
            page: safePage,
            limit: RESULTS_PAGE_SIZE,
            data: data.filter((entry): entry is CrawlResultPage => entry !== null)
        };
    }

    async cancel(id: string): Promise<CrawlJobStatusView>{
        const job = await this.#findOrThrow(id);
        if(job.status === 'pending' || job.status === 'running'){
            job.status = 'cancelled';
            await job.save();
        }
        return this.#toStatus(job);
    }

    async failStaleJobs(): Promise<number>{
        const result = await CrawlJob.updateMany(
            { status: { $in: ['pending', 'running'] } },
            { $set: { status: 'failed', error: 'interrupted by server restart', completedAt: new Date() } }
        );
        return result.modifiedCount ?? 0;
    }

    async #pageResult(url: string): Promise<CrawlResultPage | null>{
        const doc = await this.#websites.findByUrl(url);
        if(!doc) return null;
        return {
            url: doc.url,
            markdown: doc.markdown ?? '',
            metadata: {
                title: doc.title ?? '',
                description: doc.description ?? '',
                sourceURL: doc.url
            }
        };
    }

    async #findOrThrow(id: string): Promise<CrawlJobDocument>{
        if(!mongoose.isValidObjectId(id)) throw new RuntimeError(CrawlError.NotFound, 404);
        const job = await CrawlJob.findById(id);
        if(!job) throw new RuntimeError(CrawlError.NotFound, 404);
        return job;
    }

    #toStatus(job: CrawlJobDocument): CrawlJobStatusView{
        return {
            id: String(job._id),
            url: job.url,
            domain: job.domain,
            status: job.status,
            limit: job.limit,
            total: job.total,
            error: job.error,
            createdAt: job.createdAt.toISOString(),
            startedAt: job.startedAt?.toISOString(),
            completedAt: job.completedAt?.toISOString()
        };
    }
}
