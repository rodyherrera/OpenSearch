import { getDomain } from 'tldts';
import { getRedis } from '@/shared/redis/RedisClient';
import type { WorkerStat, RecentPage } from '@/modules/crawler/contracts/domain/crawl';

const QUEUE_KEY = 'frontier:queue';
const PRIORITY_KEY = 'frontier:priority';
const SEEN_KEY = 'frontier:seen';
const DOMAINS_KEY = 'frontier:domains';
const SATURATED_KEY = 'frontier:saturated';
const STORED_KEY = 'frontier:stored';
const RATE_KEY = 'frontier:rate';
const DOMRATE_KEY = 'frontier:domrate';
const RECENT_KEY = 'frontier:recent';
const WORKERS_KEY = 'frontier:workers';
const DOMAIN_KEY = (domain: string) => `frontier:cooldown:${domain}`;
const DOMPAGES_KEY = (domain: string) => `frontier:dompages:${domain}`;

const RECENT_MAX = 30;
const MAX_PATH_SEGMENTS = 8;
const MAX_QUERY_PARAMS = 4;

const BINARY_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bmp|tiff?|avif|mp4|webm|mkv|avi|mov|flv|wmv|mp3|wav|ogg|flac|aac|m4a|pdf|zip|rar|7z|tar|gz|bz2|xz|dmg|iso|exe|msi|deb|rpm|apk|woff2?|ttf|otf|eot|css|js|json|xml|rss|atom|doc|docx|xls|xlsx|ppt|pptx|psd|ai|epub|mobi)$/i;
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref'];

export const normalizeUrl = (raw: string): string | null => {
    try{
        const url = new URL(raw);
        if(url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if(BINARY_EXT.test(url.pathname)) return null;
        // Trap guard: skip very deep paths (infinite-space traps live down there).
        if(url.pathname.split('/').filter(Boolean).length > MAX_PATH_SEGMENTS) return null;
        url.hash = '';
        TRACKING_PARAMS.forEach((p) => url.searchParams.delete(p));
        // Trap guard: skip over-parameterised URLs (faceted search / calendars).
        if(url.searchParams.size > MAX_QUERY_PARAMS) return null;
        url.hostname = url.hostname.toLowerCase();
        if(url.pathname.length > 1 && url.pathname.endsWith('/')){
            url.pathname = url.pathname.slice(0, -1);
        }
        return url.toString();
    }catch{
        return null;
    }
};

// Registrable domain (eTLD+1) via the Public Suffix List, so every subdomain of a
// site collapses to one domain — blog.x.com and x.com are the SAME domain. This is
// what makes "new domain" discovery, per-domain politeness and saturation meaningful.
export const domainOf = (url: string): string => {
    return getDomain(url) ?? '';
};

export default class CrawlFrontier{
    #maxFrontier: number;
    #domainDelayMs: number;

    constructor({ maxFrontier = 500000, domainDelayMs = 1500 }: { maxFrontier?: number; domainDelayMs?: number } = {}){
        this.#maxFrontier = maxFrontier;
        this.#domainDelayMs = domainDelayMs;
    }

    setDomainDelay(ms: number): void{
        this.#domainDelayMs = ms;
    }

    async enqueue(urls: string[]): Promise<number>{
        const redis = await getRedis();
        const queueSize = await redis.lLen(QUEUE_KEY);
        if(queueSize >= this.#maxFrontier) return 0;

        const normalized = [...new Set(
            urls.map(normalizeUrl).filter((u): u is string => u !== null)
        )];
        if(!normalized.length) return 0;

        const membership = await redis.smIsMember(SEEN_KEY, normalized);
        const fresh = normalized.filter((_, i) => !membership[i]);
        if(!fresh.length) return 0;

        const freshDomains = fresh.map(domainOf);
        const distinctDomains = [...new Set(freshDomains.filter(Boolean))];

        // One round trip each: which domains are already known, and which have hit the
        // per-domain page cap (saturated → drop their URLs so the crawl fans outward).
        const [domainMembership, saturatedMembership] = distinctDomains.length
            ? await Promise.all([
                redis.smIsMember(DOMAINS_KEY, distinctDomains),
                redis.smIsMember(SATURATED_KEY, distinctDomains)
            ])
            : [[] as boolean[], [] as boolean[]];
        const knownDomain = new Map<string, boolean>();
        const saturatedDomain = new Set<string>();
        distinctDomains.forEach((d, i) => {
            knownDomain.set(d, domainMembership[i]);
            if(saturatedMembership[i]) saturatedDomain.add(d);
        });

        const priorityUrls: string[] = [];
        const normalUrls: string[] = [];
        const seenToAdd: string[] = [];
        for(let i = 0; i < fresh.length; i++){
            const domain = freshDomains[i];
            if(domain && saturatedDomain.has(domain)) continue;
            seenToAdd.push(fresh[i]);
            // URLs to never-seen domains jump the priority queue (discover-new bias).
            if(domain && !knownDomain.get(domain)){
                priorityUrls.push(fresh[i]);
            }else{
                normalUrls.push(fresh[i]);
            }
        }
        if(!seenToAdd.length) return 0;

        const newDomains = distinctDomains.filter((d) => !knownDomain.get(d) && !saturatedDomain.has(d));
        const now = Date.now();
        const multi = redis.multi();
        multi.sAdd(SEEN_KEY, seenToAdd);
        if(newDomains.length){
            multi.sAdd(DOMAINS_KEY, newDomains);
            multi.zAdd(DOMRATE_KEY, { score: now, value: `${now}:${newDomains.length}:${Math.round(now % 100000)}` });
            multi.zRemRangeByScore(DOMRATE_KEY, 0, now - 120000);
        }
        if(priorityUrls.length) multi.rPush(PRIORITY_KEY, priorityUrls);
        if(normalUrls.length) multi.rPush(QUEUE_KEY, normalUrls);
        await multi.exec();

        return seenToAdd.length;
    }

    async dequeue(count: number): Promise<string[]>{
        const redis = await getRedis();

        const popFromBoth = async (n: number): Promise<string[]> => {
            const pri = await redis.lPopCount(PRIORITY_KEY, n) || [];
            if(pri.length >= n) return pri;
            const rest = await redis.lPopCount(QUEUE_KEY, n - pri.length) || [];
            return pri.concat(rest);
        };

        if(this.#domainDelayMs <= 0){
            return await popFromBoth(count);
        }

        const window = count * 4;
        const popped = await popFromBoth(window);
        if(!popped.length) return [];

        const candidates: string[] = [];
        const candidateDomains: string[] = [];
        const leftovers: string[] = [];
        const pickedDomains = new Set<string>();

        for(const url of popped){
            const domain = domainOf(url) || '_';
            if(!pickedDomains.has(domain) && candidates.length < count){
                pickedDomains.add(domain);
                candidates.push(url);
                candidateDomains.push(domain);
            }else{
                leftovers.push(url);
            }
        }

        const multi = redis.multi();
        for(const domain of candidateDomains){
            multi.set(DOMAIN_KEY(domain), '1', { NX: true, PX: this.#domainDelayMs });
        }
        const claims = await multi.exec();

        const ready: string[] = [];
        for(let i = 0; i < candidates.length; i++){
            const claim = claims[i] as unknown;
            const claimed = claim === 'OK' || claim === true;
            if(claimed){
                ready.push(candidates[i]);
            }else{
                leftovers.push(candidates[i]);
            }
        }

        if(leftovers.length) await redis.rPush(QUEUE_KEY, leftovers);

        return ready;
    }

    async size(): Promise<number>{
        const redis = await getRedis();
        const multi = redis.multi();
        multi.lLen(PRIORITY_KEY);
        multi.lLen(QUEUE_KEY);
        const [pri, normal] = await multi.exec();
        return (Number(pri) || 0) + (Number(normal) || 0);
    }

    async domainCount(): Promise<number>{
        const redis = await getRedis();
        return redis.sCard(DOMAINS_KEY);
    }

    async seenCount(): Promise<number>{
        const redis = await getRedis();
        return redis.sCard(SEEN_KEY);
    }

    async addStored(by: number, now: number): Promise<number>{
        const redis = await getRedis();
        const multi = redis.multi();
        multi.incrBy(STORED_KEY, by);
        multi.zAdd(RATE_KEY, { score: now, value: `${now}:${by}:${Math.round(now % 100000)}` });
        multi.zRemRangeByScore(RATE_KEY, 0, now - 120000);
        const results = await multi.exec();
        return Number(results[0]) || 0;
    }

    async storedPerMin(now: number): Promise<number>{
        const redis = await getRedis();
        const events = await redis.zRangeByScore(RATE_KEY, now - 60000, now);
        let total = 0;
        for(const member of events){
            const parts = String(member).split(':');
            const count = parseInt(parts[1], 10);
            if(!Number.isNaN(count)) total += count;
        }
        return total;
    }

    // Count crawled pages per domain; once a domain reaches the cap it is marked
    // saturated, so enqueue() stops feeding it and the crawl moves to fresh domains.
    async recordDomainPages(domains: string[], cap: number): Promise<void>{
        if(!domains.length || cap <= 0) return;
        const counts = new Map<string, number>();
        for(const domain of domains){
            if(domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
        }
        if(!counts.size) return;

        const redis = await getRedis();
        const multi = redis.multi();
        for(const [domain, by] of counts) multi.incrBy(DOMPAGES_KEY(domain), by);
        const results = await multi.exec();

        const saturated: string[] = [];
        let i = 0;
        for(const [domain] of counts){
            if((Number(results[i]) || 0) >= cap) saturated.push(domain);
            i++;
        }
        if(saturated.length) await redis.sAdd(SATURATED_KEY, saturated);
    }

    // New distinct domains discovered in the trailing 60s — the metric that matters
    // when the goal is coverage, not raw page throughput.
    async domainsPerMin(now: number): Promise<number>{
        const redis = await getRedis();
        const events = await redis.zRangeByScore(DOMRATE_KEY, now - 60000, now);
        let total = 0;
        for(const member of events){
            const count = parseInt(String(member).split(':')[1], 10);
            if(!Number.isNaN(count)) total += count;
        }
        return total;
    }

    // Indexed domains with their crawled-page counts, busiest first. Sourced from the
    // per-domain page counters written during crawling.
    async indexedDomains(limit = 200): Promise<{ domain: string; pages: number }[]>{
        const redis = await getRedis();
        const prefix = 'frontier:dompages:';
        const keys: string[] = [];
        for await (const key of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 500 })){
            keys.push(key as string);
            if(keys.length >= 10000) break;
        }
        if(!keys.length) return [];
        const values = await redis.mGet(keys);
        return keys
            .map((key, i) => ({ domain: key.slice(prefix.length), pages: Number(values[i]) || 0 }))
            .sort((a, b) => b.pages - a.pages)
            .slice(0, limit);
    }

    // A peek at the URLs waiting to be crawled (priority queue first, then normal).
    async queueSample(limit = 200): Promise<string[]>{
        const redis = await getRedis();
        const priority = await redis.lRange(PRIORITY_KEY, 0, limit - 1);
        if(priority.length >= limit) return priority;
        const normal = await redis.lRange(QUEUE_KEY, 0, limit - priority.length - 1);
        return priority.concat(normal);
    }

    async storedCount(): Promise<number>{
        const redis = await getRedis();
        const value = await redis.get(STORED_KEY);
        return value ? parseInt(value, 10) : 0;
    }

    async recordWorker(workerId: string, lastBatch: number, now: number): Promise<WorkerStat>{
        const redis = await getRedis();
        const raw = await redis.hGet(WORKERS_KEY, workerId);
        let stored = 0;
        if(raw){
            try{ stored = (JSON.parse(raw).stored as number) || 0; }catch{ }
        }
        const stat: WorkerStat = {
            id: workerId,
            stored: stored + lastBatch,
            lastBatch,
            lastSeen: now
        };
        await redis.hSet(WORKERS_KEY, workerId, JSON.stringify(stat));
        return stat;
    }

    async getWorkers(now = 0, staleMs = 120000): Promise<WorkerStat[]>{
        const redis = await getRedis();
        const all = await redis.hGetAll(WORKERS_KEY);
        const workers: WorkerStat[] = [];
        const stale: string[] = [];
        for(const [id, value] of Object.entries(all)){
            try{
                const stat = JSON.parse(value) as WorkerStat;
                if(now && (now - stat.lastSeen) > staleMs){
                    stale.push(id);
                }else{
                    workers.push(stat);
                }
            }catch{ stale.push(id); }
        }
        if(stale.length) await redis.hDel(WORKERS_KEY, stale);
        return workers.sort((a, b) => b.lastSeen - a.lastSeen);
    }

    async pushRecent(pages: RecentPage[]): Promise<void>{
        if(!pages.length) return;
        const redis = await getRedis();
        const multi = redis.multi();
        multi.lPush(RECENT_KEY, pages.map((p) => JSON.stringify(p)));
        multi.lTrim(RECENT_KEY, 0, RECENT_MAX - 1);
        await multi.exec();
    }

    async getRecent(limit = RECENT_MAX): Promise<RecentPage[]>{
        const redis = await getRedis();
        const raw = await redis.lRange(RECENT_KEY, 0, limit - 1);
        const pages: RecentPage[] = [];
        for(const value of raw){
            try{ pages.push(JSON.parse(value) as RecentPage); }catch{ }
        }
        return pages;
    }
}
