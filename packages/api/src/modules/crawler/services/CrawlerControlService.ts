import { getRedis } from '@/shared/redis/RedisClient';
import { config } from '@/shared/config';
import { publishControlEvent } from '@/modules/crawler/services/CrawlEventPublisher';
import type { Tuning, ControlState } from '@/modules/crawler/contracts/domain/control';

const CONTROL_KEY = 'crawler:control';

// Sane lower bounds so a bad PATCH can't wedge the crawler
const MIN_CONCURRENCY = 1;
const MIN_BATCH_SIZE = 1;
const MIN_DOMAIN_DELAY_MS = 0;
const MIN_MAX_LINKS_PER_PAGE = 1;
const MIN_TIMEOUT_MS = 1000;

export default class CrawlerControlService{
    async getControl(): Promise<ControlState>{
        const redis = await getRedis();
        const raw = await redis.hGetAll(CONTROL_KEY);
        const tuning = this.#mergeTuning(raw);
        const paused = raw.paused === '1';
        return { paused, tuning };
    }

    async setPaused(paused: boolean, at: number): Promise<void>{
        const redis = await getRedis();
        await redis.hSet(CONTROL_KEY, 'paused', paused ? '1' : '0');
        await publishControlEvent(paused, at);
    }

    async patchTuning(patch: Partial<Tuning>): Promise<ControlState>{
        const redis = await getRedis();
        const fields: Record<string, string> = {};
        this.#applyNumber(fields, patch, 'concurrency', MIN_CONCURRENCY);
        this.#applyNumber(fields, patch, 'batchSize', MIN_BATCH_SIZE);
        this.#applyNumber(fields, patch, 'domainDelayMs', MIN_DOMAIN_DELAY_MS);
        this.#applyNumber(fields, patch, 'maxLinksPerPage', MIN_MAX_LINKS_PER_PAGE);
        this.#applyNumber(fields, patch, 'timeoutMs', MIN_TIMEOUT_MS);
        if(patch.respectRobots !== undefined){
            fields.respectRobots = patch.respectRobots ? '1' : '0';
        }
        if(Object.keys(fields).length){
            await redis.hSet(CONTROL_KEY, fields);
        }
        return this.getControl();
    }

    async isPaused(): Promise<boolean>{
        const redis = await getRedis();
        const value = await redis.hGet(CONTROL_KEY, 'paused');
        return value === '1';
    }

    async readTuning(): Promise<Tuning>{
        const { tuning } = await this.getControl();
        return tuning;
    }

    // Overlay whatever is stored in redis on top of the config defaults
    #mergeTuning(raw: Record<string, string>): Tuning{
        return {
            concurrency: this.#num(raw.concurrency, config.crawler.concurrency, MIN_CONCURRENCY),
            batchSize: this.#num(raw.batchSize, config.crawler.batchSize, MIN_BATCH_SIZE),
            domainDelayMs: this.#num(raw.domainDelayMs, config.crawler.domainDelayMs, MIN_DOMAIN_DELAY_MS),
            maxLinksPerPage: this.#num(raw.maxLinksPerPage, config.crawler.maxLinksPerPage, MIN_MAX_LINKS_PER_PAGE),
            timeoutMs: this.#num(raw.timeoutMs, config.crawler.timeoutMs, MIN_TIMEOUT_MS),
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
