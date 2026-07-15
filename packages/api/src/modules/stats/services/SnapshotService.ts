import CrawlFrontier from '@/modules/crawler/services/CrawlFrontier';
import WebsiteService from '@/modules/website/services/WebsiteService';
import type { Snapshot, WorkerStat, RecentPage } from '@/modules/stats/contracts/domain/snapshot';

const WORKER_ONLINE_MS = 15000;

export default class SnapshotService{
    #frontier = new CrawlFrontier();
    #websites = new WebsiteService();

    async build(now: number): Promise<Snapshot>{
        const [websites, frontier, seen, stored, perMin, workers, recent, domains] = await Promise.all([
            this.#websites.estimatedCount(),
            this.#frontier.size().catch(() => 0),
            this.#frontier.seenCount().catch(() => 0),
            this.#frontier.storedCount().catch(() => 0),
            this.#frontier.storedPerMin(now).catch(() => 0),
            this.#frontier.getWorkers(now).catch(() => [] as WorkerStat[]),
            this.#frontier.getRecent(15).catch(() => [] as RecentPage[]),
            this.#frontier.domainCount().catch(() => 0)
        ]);

        const decoratedWorkers = workers.map((worker) => ({
            ...worker,
            online: (now - worker.lastSeen) <= WORKER_ONLINE_MS
        }));

        return {
            type: 'snapshot',
            ts: now,
            websites,
            frontier,
            seen,
            stored,
            perMin,
            domains,
            workers: decoratedWorkers,
            recent
        };
    }
}
