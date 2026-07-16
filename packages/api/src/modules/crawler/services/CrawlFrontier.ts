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
const WS_DOMAINS_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:domains`;
const WS_QUEUE_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:queue`;
const WS_FOLLOWEXT_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:followext`;
const WS_ACTIVE_KEY = 'frontier:ws:active';

export interface FrontierItem{
    url: string;
    workspaceId: string | null;
}

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
        if(url.pathname.split('/').filter(Boolean).length > MAX_PATH_SEGMENTS) return null;
        url.hash = '';
        TRACKING_PARAMS.forEach((p) => url.searchParams.delete(p));
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

    async enqueue(urls: string[], workspaceId?: string | null): Promise<number>{
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
        if(workspaceId){
            multi.rPush(WS_QUEUE_KEY(workspaceId), seenToAdd);
            multi.sAdd(WS_ACTIVE_KEY, workspaceId);
        }else{
            if(priorityUrls.length) multi.rPush(PRIORITY_KEY, priorityUrls);
            if(normalUrls.length) multi.rPush(QUEUE_KEY, normalUrls);
        }
        await multi.exec();

        return seenToAdd.length;
    }

    async registerWorkspaceDomains(workspaceId: string, domains: string[]): Promise<void>{
        const clean = [...new Set(domains.filter(Boolean))];
        if(!clean.length) return;
        const redis = await getRedis();
        await redis.sAdd(WS_DOMAINS_KEY(workspaceId), clean);
    }

    async getWorkspaceDomains(workspaceId: string): Promise<Set<string>>{
        const redis = await getRedis();
        return new Set(await redis.sMembers(WS_DOMAINS_KEY(workspaceId)));
    }

    async setWorkspaceFollowExternal(workspaceId: string, on: boolean): Promise<void>{
        const redis = await getRedis();
        if(on) await redis.set(WS_FOLLOWEXT_KEY(workspaceId), '1');
        else await redis.del(WS_FOLLOWEXT_KEY(workspaceId));
    }

    async getWorkspaceFollowExternal(workspaceId: string): Promise<boolean>{
        const redis = await getRedis();
        return (await redis.exists(WS_FOLLOWEXT_KEY(workspaceId))) === 1;
    }

    async #claimByDomain(urls: string[]): Promise<{ ready: string[]; blocked: string[] }>{
        if(this.#domainDelayMs <= 0) return { ready: urls, blocked: [] };
        const redis = await getRedis();
        const multi = redis.multi();
        for(const url of urls) multi.set(DOMAIN_KEY(domainOf(url) || '_'), '1', { NX: true, PX: this.#domainDelayMs });
        const claims = await multi.exec();
        const ready: string[] = [];
        const blocked: string[] = [];
        for(let i = 0; i < urls.length; i++){
            const claim = claims[i] as unknown;
            (claim === 'OK' || claim === true ? ready : blocked).push(urls[i]);
        }
        return { ready, blocked };
    }

    // Fair share for active workspace crawls: round-robin a slice of the batch across
    // their lanes so a large global backlog can't starve a freshly-seeded workspace,
    // and no single workspace can monopolise the reserved slice.
    async #drainWorkspaces(budget: number): Promise<FrontierItem[]>{
        if(budget <= 0) return [];
        const redis = await getRedis();
        const active = await redis.sMembers(WS_ACTIVE_KEY);
        if(!active.length) return [];

        const perLane = Math.max(1, Math.ceil(budget / active.length));
        const pickedByLane = new Map<string, string[]>();
        const emptied: string[] = [];
        let total = 0;
        for(const workspaceId of active){
            if(total >= budget) break;
            const take = Math.min(perLane, budget - total);
            const urls = (await redis.lPopCount(WS_QUEUE_KEY(workspaceId), take)) || [];
            if(urls.length) pickedByLane.set(workspaceId, urls);
            total += urls.length;
            if(urls.length < take && (await redis.lLen(WS_QUEUE_KEY(workspaceId))) === 0) emptied.push(workspaceId);
        }
        if(emptied.length) await redis.sRem(WS_ACTIVE_KEY, emptied);
        if(!pickedByLane.size) return [];

        const ready: FrontierItem[] = [];
        const requeue = redis.multi();
        let hasRequeue = false;
        for(const [workspaceId, urls] of pickedByLane){
            const { ready: claimed, blocked } = await this.#claimByDomain(urls);
            for(const url of claimed) ready.push({ url, workspaceId });
            if(blocked.length){
                requeue.rPush(WS_QUEUE_KEY(workspaceId), blocked);
                requeue.sAdd(WS_ACTIVE_KEY, workspaceId);
                hasRequeue = true;
            }
        }
        if(hasRequeue) await requeue.exec();
        return ready;
    }

    async #pickGlobal(count: number): Promise<string[]>{
        if(count <= 0) return [];
        const redis = await getRedis();

        const popFromBoth = async (n: number): Promise<string[]> => {
            const pri = await redis.lPopCount(PRIORITY_KEY, n) || [];
            if(pri.length >= n) return pri;
            const rest = await redis.lPopCount(QUEUE_KEY, n - pri.length) || [];
            return pri.concat(rest);
        };

        if(this.#domainDelayMs <= 0){
            return popFromBoth(count);
        }

        const window = count * 4;
        const popped = await popFromBoth(window);
        if(!popped.length) return [];

        const candidates: string[] = [];
        const leftovers: string[] = [];
        const pickedDomains = new Set<string>();
        for(const url of popped){
            const domain = domainOf(url) || '_';
            if(!pickedDomains.has(domain) && candidates.length < count){
                pickedDomains.add(domain);
                candidates.push(url);
            }else{
                leftovers.push(url);
            }
        }

        const { ready, blocked } = await this.#claimByDomain(candidates);
        const back = leftovers.concat(blocked);
        if(back.length) await redis.rPush(QUEUE_KEY, back);
        return ready;
    }

    async dequeue(count: number): Promise<FrontierItem[]>{
        const workspaceItems = await this.#drainWorkspaces(Math.ceil(count / 2));
        const globalUrls = await this.#pickGlobal(count - workspaceItems.length);
        return [...workspaceItems, ...globalUrls.map((url) => ({ url, workspaceId: null }))];
    }

    async size(): Promise<number>{
        const redis = await getRedis();
        const multi = redis.multi();
        multi.lLen(PRIORITY_KEY);
        multi.lLen(QUEUE_KEY);
        const [pri, normal] = await multi.exec();
        let total = (Number(pri) || 0) + (Number(normal) || 0);

        const active = await redis.sMembers(WS_ACTIVE_KEY);
        if(active.length){
            const laneMulti = redis.multi();
            for(const workspaceId of active) laneMulti.lLen(WS_QUEUE_KEY(workspaceId));
            const lengths = await laneMulti.exec();
            for(const length of lengths) total += Number(length) || 0;
        }
        return total;
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
