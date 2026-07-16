export interface SnapshotFrame{
    type: 'snapshot';
    ts: number;
    websites: number;
    frontier: number;
    seen: number;
    stored: number;
    perMin: number;
    domainsPerMin: number;
    domains: number;
    workers: {
        id: string;
        stored: number;
        lastBatch: number;
        lastSeen: number;
        online: boolean;
    }[];
    recent: {
        url: string;
        title: string;
        worker: string;
        at: number;
    }[];
}

export interface PageFrame{
    type: 'page';
    worker: string;
    url: string;
    title: string;
    domain: string;
    links: string[];
    at: number;
}

export interface BatchFrame{
    type: 'batch';
    worker: string;
    stored: number;
    workerStored: number;
    totalStored: number;
    perMin: number;
    domainsPerMin: number;
    frontier: number;
    seen: number;
    domains: number;
    discovered: number;
    at: number;
}

export interface ControlFrame{
    type: 'control';
    paused: boolean;
    at: number;
}

export type RecentItem = SnapshotFrame['recent'][number];
export type WorkerInfo = SnapshotFrame['workers'][number];
