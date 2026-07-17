import { getRedis } from '@/shared/redis/RedisClient';
import UrlNormalizer from '@/modules/crawler/services/UrlNormalizer';
import type { FrontierItem } from '@/modules/crawler/contracts/domain/crawl';

interface CrawlFrontierOptions{
    maxFrontier?: number;
    domainDelayMs?: number;
    workspaceDomainDelayMs?: number;
    workspaceDomainConcurrency?: number;
}

interface ClaimResult{
    ready: string[];
    blocked: string[];
}

export default class CrawlFrontier{
    private static readonly QUEUE_KEY = 'frontier:queue';
    private static readonly PRIORITY_KEY = 'frontier:priority';
    private static readonly SEEN_KEY = 'frontier:seen';
    private static readonly DOMAINS_KEY = 'frontier:domains';
    private static readonly SATURATED_KEY = 'frontier:saturated';
    private static readonly DOMRATE_KEY = 'frontier:domrate';
    private static readonly WS_ACTIVE_KEY = 'frontier:ws:active';
    private static readonly DOMAIN_KEY = (domain: string) => `frontier:cooldown:${domain}`;
    private static readonly WS_COOLDOWN_KEY = (domain: string) => `frontier:wscooldown:${domain}`;
    private static readonly DOMPAGES_KEY = (domain: string) => `frontier:dompages:${domain}`;
    private static readonly WS_QUEUE_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:queue`;
    private static readonly WS_SEEN_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:seen`;

    #maxFrontier: number;
    #domainDelayMs: number;
    #workspaceDomainDelayMs: number;
    #workspaceDomainConcurrency: number;

    constructor({ maxFrontier = 500000, domainDelayMs = 1500, workspaceDomainDelayMs = 1000, workspaceDomainConcurrency = 8 }: CrawlFrontierOptions = {}){
        this.#maxFrontier = maxFrontier;
        this.#domainDelayMs = domainDelayMs;
        this.#workspaceDomainDelayMs = workspaceDomainDelayMs;
        this.#workspaceDomainConcurrency = workspaceDomainConcurrency;
    }

    setDomainDelay(ms: number): void{
        this.#domainDelayMs = ms;
    }

    async enqueue(urls: string[], workspaceId?: string | null): Promise<number>{
        const redis = await getRedis();
        const queueSize = await redis.lLen(CrawlFrontier.QUEUE_KEY);
        if(queueSize >= this.#maxFrontier) return 0;

        const normalized = [...new Set(
            urls.map(UrlNormalizer.normalizeUrl).filter((u): u is string => u !== null)
        )];
        if(!normalized.length) return 0;

        const membership = await redis.smIsMember(CrawlFrontier.SEEN_KEY, normalized);
        const fresh = normalized.filter((_, i) => !membership[i]);
        if(!fresh.length) return 0;

        const freshDomains = fresh.map(UrlNormalizer.domainOf);
        const distinctDomains = [...new Set(freshDomains.filter(Boolean))];

        const [domainMembership, saturatedMembership] = distinctDomains.length
            ? await Promise.all([
                redis.smIsMember(CrawlFrontier.DOMAINS_KEY, distinctDomains),
                redis.smIsMember(CrawlFrontier.SATURATED_KEY, distinctDomains)
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
        multi.sAdd(CrawlFrontier.SEEN_KEY, seenToAdd);
        if(newDomains.length){
            multi.sAdd(CrawlFrontier.DOMAINS_KEY, newDomains);
            multi.zAdd(CrawlFrontier.DOMRATE_KEY, { score: now, value: `${now}:${newDomains.length}:${Math.round(now % 100000)}` });
            multi.zRemRangeByScore(CrawlFrontier.DOMRATE_KEY, 0, now - 120000);
        }
        if(workspaceId){
            multi.rPush(CrawlFrontier.WS_QUEUE_KEY(workspaceId), seenToAdd);
            multi.sAdd(CrawlFrontier.WS_ACTIVE_KEY, workspaceId);
        }else{
            if(priorityUrls.length) multi.rPush(CrawlFrontier.PRIORITY_KEY, priorityUrls);
            if(normalUrls.length) multi.rPush(CrawlFrontier.QUEUE_KEY, normalUrls);
        }
        await multi.exec();

        return seenToAdd.length;
    }

    async enqueueScoped(urls: string[], workspaceId: string): Promise<number>{
        const normalized = [...new Set(
            urls.map(UrlNormalizer.normalizeUrl).filter((u): u is string => u !== null)
        )];
        if(!normalized.length) return 0;

        const redis = await getRedis();
        if((await redis.lLen(CrawlFrontier.WS_QUEUE_KEY(workspaceId))) >= this.#maxFrontier) return 0;

        const membership = await redis.smIsMember(CrawlFrontier.WS_SEEN_KEY(workspaceId), normalized);
        const fresh = normalized.filter((_, i) => !membership[i]);
        if(!fresh.length) return 0;

        const multi = redis.multi();
        multi.sAdd(CrawlFrontier.WS_SEEN_KEY(workspaceId), fresh);
        multi.sAdd(CrawlFrontier.SEEN_KEY, fresh);
        multi.rPush(CrawlFrontier.WS_QUEUE_KEY(workspaceId), fresh);
        multi.sAdd(CrawlFrontier.WS_ACTIVE_KEY, workspaceId);
        await multi.exec();
        return fresh.length;
    }

    async forceEnqueue(urls: string[], workspaceId: string): Promise<number>{
        const normalized = [...new Set(
            urls.map(UrlNormalizer.normalizeUrl).filter((u): u is string => u !== null)
        )];
        if(!normalized.length) return 0;
        const redis = await getRedis();
        const multi = redis.multi();
        multi.rPush(CrawlFrontier.WS_QUEUE_KEY(workspaceId), normalized);
        multi.sAdd(CrawlFrontier.WS_ACTIVE_KEY, workspaceId);
        await multi.exec();
        return normalized.length;
    }

    async workspaceQueueLength(workspaceId: string): Promise<number>{
        const redis = await getRedis();
        return redis.lLen(CrawlFrontier.WS_QUEUE_KEY(workspaceId));
    }

    async #claimByDomain(urls: string[], delayMs: number, keyFn: (domain: string) => string, concurrency: number): Promise<ClaimResult>{
        if(delayMs <= 0) return { ready: urls, blocked: [] };
        const redis = await getRedis();
        const keys = urls.map((url) => keyFn(UrlNormalizer.domainOf(url) || '_'));
        const incr = redis.multi();
        for(const key of keys) incr.incr(key);
        const counts = await incr.exec();

        const expire = redis.multi();
        let hasExpire = false;
        const ready: string[] = [];
        const blocked: string[] = [];
        for(let i = 0; i < urls.length; i++){
            const count = Number(counts[i]) || 0;
            if(count === 1){
                expire.pExpire(keys[i], delayMs);
                hasExpire = true;
            }
            (count >= 1 && count <= concurrency ? ready : blocked).push(urls[i]);
        }
        if(hasExpire) await expire.exec();
        return { ready, blocked };
    }

    async #drainWorkspaces(budget: number): Promise<FrontierItem[]>{
        if(budget <= 0) return [];
        const redis = await getRedis();
        const active = await redis.sMembers(CrawlFrontier.WS_ACTIVE_KEY);
        if(!active.length) return [];

        const perLane = Math.max(1, Math.ceil(budget / active.length));
        const pickedByLane = new Map<string, string[]>();
        const emptied: string[] = [];
        let total = 0;
        for(const workspaceId of active){
            if(total >= budget) break;
            const take = Math.min(perLane, budget - total);
            const urls = (await redis.lPopCount(CrawlFrontier.WS_QUEUE_KEY(workspaceId), take)) || [];
            if(urls.length) pickedByLane.set(workspaceId, urls);
            total += urls.length;
            if(urls.length < take && (await redis.lLen(CrawlFrontier.WS_QUEUE_KEY(workspaceId))) === 0) emptied.push(workspaceId);
        }
        if(emptied.length) await redis.sRem(CrawlFrontier.WS_ACTIVE_KEY, emptied);
        if(!pickedByLane.size) return [];

        const ready: FrontierItem[] = [];
        const requeue = redis.multi();
        let hasRequeue = false;
        for(const [workspaceId, urls] of pickedByLane){
            const { ready: claimed, blocked } = await this.#claimByDomain(urls, this.#workspaceDomainDelayMs, CrawlFrontier.WS_COOLDOWN_KEY, this.#workspaceDomainConcurrency);
            for(const url of claimed) ready.push({ url, workspaceId });
            if(blocked.length){
                requeue.rPush(CrawlFrontier.WS_QUEUE_KEY(workspaceId), blocked);
                requeue.sAdd(CrawlFrontier.WS_ACTIVE_KEY, workspaceId);
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
            const pri = await redis.lPopCount(CrawlFrontier.PRIORITY_KEY, n) || [];
            if(pri.length >= n) return pri;
            const rest = await redis.lPopCount(CrawlFrontier.QUEUE_KEY, n - pri.length) || [];
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
            const domain = UrlNormalizer.domainOf(url) || '_';
            if(!pickedDomains.has(domain) && candidates.length < count){
                pickedDomains.add(domain);
                candidates.push(url);
            }else{
                leftovers.push(url);
            }
        }

        const { ready, blocked } = await this.#claimByDomain(candidates, this.#domainDelayMs, CrawlFrontier.DOMAIN_KEY, 1);
        const back = leftovers.concat(blocked);
        if(back.length) await redis.rPush(CrawlFrontier.QUEUE_KEY, back);
        return ready;
    }

    async dequeue(count: number): Promise<FrontierItem[]>{
        const workspaceItems = await this.#drainWorkspaces(count);
        const globalUrls = await this.#pickGlobal(count - workspaceItems.length);
        return [...workspaceItems, ...globalUrls.map((url) => ({ url, workspaceId: null }))];
    }

    async size(): Promise<number>{
        const redis = await getRedis();
        const multi = redis.multi();
        multi.lLen(CrawlFrontier.PRIORITY_KEY);
        multi.lLen(CrawlFrontier.QUEUE_KEY);
        const [pri, normal] = await multi.exec();
        let total = (Number(pri) || 0) + (Number(normal) || 0);

        const active = await redis.sMembers(CrawlFrontier.WS_ACTIVE_KEY);
        if(active.length){
            const laneMulti = redis.multi();
            for(const workspaceId of active) laneMulti.lLen(CrawlFrontier.WS_QUEUE_KEY(workspaceId));
            const lengths = await laneMulti.exec();
            for(const length of lengths) total += Number(length) || 0;
        }
        return total;
    }

    async domainCount(): Promise<number>{
        const redis = await getRedis();
        return redis.sCard(CrawlFrontier.DOMAINS_KEY);
    }

    async seenCount(): Promise<number>{
        const redis = await getRedis();
        return redis.sCard(CrawlFrontier.SEEN_KEY);
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
        for(const [domain, by] of counts) multi.incrBy(CrawlFrontier.DOMPAGES_KEY(domain), by);
        const results = await multi.exec();

        const saturated: string[] = [];
        let i = 0;
        for(const [domain] of counts){
            if((Number(results[i]) || 0) >= cap) saturated.push(domain);
            i++;
        }
        if(saturated.length) await redis.sAdd(CrawlFrontier.SATURATED_KEY, saturated);
    }

    async domainsPerMin(now: number): Promise<number>{
        const redis = await getRedis();
        const events = await redis.zRangeByScore(CrawlFrontier.DOMRATE_KEY, now - 60000, now);
        let total = 0;
        for(const member of events){
            const count = parseInt(String(member).split(':')[1], 10);
            if(!Number.isNaN(count)) total += count;
        }
        return total;
    }
}
