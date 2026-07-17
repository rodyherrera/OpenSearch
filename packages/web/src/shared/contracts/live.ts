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

export type RecentItem = SnapshotFrame['recent'][number];
export type WorkerInfo = SnapshotFrame['workers'][number];

// --- Workspace-scoped live frames (tenant view) ---

export interface WsPageRow{
    url: string;
    title: string;
    domain: string;
    at: number;
}

export interface Counts{
    pages: number;
    domains: number;
    changes: number;
}

export interface WsRecentPage{
    id: string;
    url: string;
    title?: string;
    domain?: string;
    createdAt: string;
}

export interface LiveDomain{
    domain: string;
    pages: number;
}

export interface LiveSeed{
    id: string;
    url: string;
    domain: string;
    createdAt: string;
}

export interface LiveChange{
    url: string;
    at: number;
}

export interface WsSnapshotFrame{
    type: 'ws:snapshot';
    workspaceId: string;
    ts: number;
    counts: Counts;
    recentPages: WsRecentPage[];
    domains: LiveDomain[];
    seeds: LiveSeed[];
    changes: LiveChange[];
}

export interface WsPageFrame{
    type: 'ws:page';
    workspaceId: string;
    pages: WsPageRow[];
    at: number;
}

export interface WsSeedFrame{
    type: 'ws:seed';
    workspaceId: string;
    seeds: LiveSeed[];
    at: number;
}

export interface WsRemovedFrame{
    type: 'ws:removed';
    workspaceId: string;
    kind: 'page' | 'seed' | 'domain';
    id?: string;
    url?: string;
    domain?: string;
    at: number;
}

export interface ChangeFrame{
    type: 'change';
    workspaceId: string;
    urls: string[];
    count: number;
    at: number;
}
