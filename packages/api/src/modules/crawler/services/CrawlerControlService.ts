import { getRedis } from '@/shared/redis/RedisClient';
import { config } from '@/shared/config';
import CrawlEventPublisher from '@/modules/crawler/services/CrawlEventPublisher';
import type { Tuning, ControlState } from '@/modules/crawler/contracts/domain/control';

export default class CrawlerControlService{
    private static readonly CONTROL_KEY = 'crawler:control';
    private static readonly MIN_CONCURRENCY = 1;
    private static readonly MIN_BATCH_SIZE = 1;
    private static readonly MIN_DOMAIN_DELAY_MS = 0;
    private static readonly MIN_MAX_LINKS_PER_PAGE = 1;
    private static readonly MIN_TIMEOUT_MS = 1000;

    #publisher = new CrawlEventPublisher();

    async getControl(): Promise<ControlState>{
        const redis = await getRedis();
        const raw = await redis.hGetAll(CrawlerControlService.CONTROL_KEY);
        const tuning = this.#mergeTuning(raw);
        const paused = raw.paused === '1';
        return { paused, tuning };
    }

    async setPaused(paused: boolean, at: number): Promise<void>{
        const redis = await getRedis();
        await redis.hSet(CrawlerControlService.CONTROL_KEY, 'paused', paused ? '1' : '0');
        await this.#publisher.publishControlEvent(paused, at);
    }

    async patchTuning(patch: Partial<Tuning>): Promise<ControlState>{
        const redis = await getRedis();
        const fields: Record<string, string> = {};
        this.#applyNumber(fields, patch, 'concurrency', CrawlerControlService.MIN_CONCURRENCY);
        this.#applyNumber(fields, patch, 'batchSize', CrawlerControlService.MIN_BATCH_SIZE);
        this.#applyNumber(fields, patch, 'domainDelayMs', CrawlerControlService.MIN_DOMAIN_DELAY_MS);
        this.#applyNumber(fields, patch, 'maxLinksPerPage', CrawlerControlService.MIN_MAX_LINKS_PER_PAGE);
        this.#applyNumber(fields, patch, 'timeoutMs', CrawlerControlService.MIN_TIMEOUT_MS);
        if(patch.respectRobots !== undefined){
            fields.respectRobots = patch.respectRobots ? '1' : '0';
        }
        if(Object.keys(fields).length){
            await redis.hSet(CrawlerControlService.CONTROL_KEY, fields);
        }
        return this.getControl();
    }

    async isPaused(): Promise<boolean>{
        const redis = await getRedis();
        const value = await redis.hGet(CrawlerControlService.CONTROL_KEY, 'paused');
        return value === '1';
    }

    async readTuning(): Promise<Tuning>{
        const { tuning } = await this.getControl();
        return tuning;
    }

    #mergeTuning(raw: Record<string, string>): Tuning{
        return {
            concurrency: this.#num(raw.concurrency, config.crawler.concurrency, CrawlerControlService.MIN_CONCURRENCY),
            batchSize: this.#num(raw.batchSize, config.crawler.batchSize, CrawlerControlService.MIN_BATCH_SIZE),
            domainDelayMs: this.#num(raw.domainDelayMs, config.crawler.domainDelayMs, CrawlerControlService.MIN_DOMAIN_DELAY_MS),
            maxLinksPerPage: this.#num(raw.maxLinksPerPage, config.crawler.maxLinksPerPage, CrawlerControlService.MIN_MAX_LINKS_PER_PAGE),
            timeoutMs: this.#num(raw.timeoutMs, config.crawler.timeoutMs, CrawlerControlService.MIN_TIMEOUT_MS),
            respectRobots: raw.respectRobots === undefined
                ? config.crawler.respectRobots
                : raw.respectRobots === '1'
        };
    }

    #num(value: string | undefined, fallback: number, min: number): number{
        if(value === undefined) return fallback;
        const parsed = parseInt(value, 10);
        if(Number.isNaN(parsed)) return fallback;
        return parsed < min ? min : parsed;
    }

    #applyNumber(fields: Record<string, string>, patch: Partial<Tuning>, key: keyof Tuning, min: number): void{
        const value = patch[key];
        if(typeof value !== 'number' || Number.isNaN(value)) return;
        const clamped = value < min ? min : value;
        fields[key] = String(clamped);
    }
}
