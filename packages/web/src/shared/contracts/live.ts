// Frozen wire shapes for the Crawlm `/ws` live feed. The server sends FLAT frames
// (top-level `type` plus fields); SocketChannel unwraps them to the whole object.

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

export type WorkerLive = SnapshotFrame['workers'][number];
export type RecentItem = SnapshotFrame['recent'][number];
