import type CrawlFrontier from '@/modules/crawler/services/CrawlFrontier';

export type WorkerStat = Awaited<ReturnType<CrawlFrontier['getWorkers']>>[number];

export type RecentPage = Awaited<ReturnType<CrawlFrontier['getRecent']>>[number];

export type SnapshotWorker = WorkerStat & { online: boolean };

export interface Snapshot{
    type: 'snapshot';
    ts: number;
    websites: number;
    frontier: number;
    seen: number;
    stored: number;
    perMin: number;
    domains: number;
    workers: SnapshotWorker[];
    recent: RecentPage[];
}
