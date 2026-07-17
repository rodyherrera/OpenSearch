import { getRedis } from '@/shared/redis/RedisClient';
import type { WorkerStat, RecentPage } from '@/modules/fleet/contracts/domain/crawl';

export default class CrawlMetrics{
    private static readonly STORED_KEY = 'frontier:stored';
    private static readonly RATE_KEY = 'frontier:rate';
    private static readonly WORKERS_KEY = 'frontier:workers';
    private static readonly RECENT_KEY = 'frontier:recent';
    private static readonly RECENT_MAX = 30;

    async addStored(by: number, now: number): Promise<number>{
        const redis = await getRedis();
        const multi = redis.multi();
        multi.incrBy(CrawlMetrics.STORED_KEY, by);
        multi.zAdd(CrawlMetrics.RATE_KEY, { score: now, value: `${now}:${by}:${Math.round(now % 100000)}` });
        multi.zRemRangeByScore(CrawlMetrics.RATE_KEY, 0, now - 120000);
        const results = await multi.exec();
        return Number(results[0]) || 0;
    }

    async storedPerMin(now: number): Promise<number>{
        const redis = await getRedis();
        const events = await redis.zRangeByScore(CrawlMetrics.RATE_KEY, now - 60000, now);
        let total = 0;
        for(const member of events){
            const count = parseInt(String(member).split(':')[1], 10);
            if(!Number.isNaN(count)) total += count;
        }
        return total;
    }

    async storedCount(): Promise<number>{
        const redis = await getRedis();
        const value = await redis.get(CrawlMetrics.STORED_KEY);
        return value ? parseInt(value, 10) : 0;
    }

    async recordWorker(workerId: string, lastBatch: number, now: number): Promise<WorkerStat>{
        const redis = await getRedis();
        const raw = await redis.hGet(CrawlMetrics.WORKERS_KEY, workerId);
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
        await redis.hSet(CrawlMetrics.WORKERS_KEY, workerId, JSON.stringify(stat));
        return stat;
    }

    async getWorkers(now = 0, staleMs = 120000): Promise<WorkerStat[]>{
        const redis = await getRedis();
        const all = await redis.hGetAll(CrawlMetrics.WORKERS_KEY);
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
        if(stale.length) await redis.hDel(CrawlMetrics.WORKERS_KEY, stale);
        return workers.sort((a, b) => b.lastSeen - a.lastSeen);
    }

    async pushRecent(pages: RecentPage[]): Promise<void>{
        if(!pages.length) return;
        const redis = await getRedis();
        const multi = redis.multi();
        multi.lPush(CrawlMetrics.RECENT_KEY, pages.map((page) => JSON.stringify(page)));
        multi.lTrim(CrawlMetrics.RECENT_KEY, 0, CrawlMetrics.RECENT_MAX - 1);
        await multi.exec();
    }

    async getRecent(limit = CrawlMetrics.RECENT_MAX): Promise<RecentPage[]>{
        const redis = await getRedis();
        const raw = await redis.lRange(CrawlMetrics.RECENT_KEY, 0, limit - 1);
        const pages: RecentPage[] = [];
        for(const value of raw){
            try{ pages.push(JSON.parse(value) as RecentPage); }catch{ }
        }
        return pages;
    }
}
