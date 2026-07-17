export interface CrawlEngineOptions{
    workerId?: string;
    concurrency?: number;
    batchSize?: number;
    domainDelayMs?: number;
    maxLinksPerPage?: number;
    maxFrontier?: number;
    maxPages?: number;
    respectRobots?: boolean;
    timeoutMs?: number;
}

export interface FrontierItem{
    url: string;
    workspaceId: string | null;
}

export type WorkspaceByUrl = Map<string, string | null>;

export interface WorkerStat{
    id: string;
    stored: number;
    lastBatch: number;
    lastSeen: number;
}

export interface RecentPage{
    url: string;
    title: string;
    worker: string;
    at: number;
}
