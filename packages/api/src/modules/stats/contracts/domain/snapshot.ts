import type { WorkerStat, RecentPage } from '@/modules/crawler/contracts/domain/crawl';

export type { WorkerStat, RecentPage };

export type SnapshotWorker = WorkerStat & { online: boolean };

export interface Snapshot{
    type: 'snapshot';
    ts: number;
    websites: number;
    frontier: number;
    seen: number;
    stored: number;
    perMin: number;
    domainsPerMin: number;
    domains: number;
    workers: SnapshotWorker[];
    recent: RecentPage[];
}
