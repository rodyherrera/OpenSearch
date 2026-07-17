import type { PublicSeed } from '@/modules/seed/contracts/domain/seed';

export const CRAWL_CHANNEL = 'crawl:events';

export interface PageEvent{
    type: 'page';
    worker: string;
    url: string;
    title: string;
    domain: string;
    links: string[];
    at: number;
}

export interface BatchEvent{
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

export interface ControlEvent{
    type: 'control';
    paused: boolean;
    at: number;
}

export interface ChangeEvent{
    type: 'change';
    workspaceId: string;
    urls: string[];
    count: number;
    at: number;
}

export interface WorkspaceChange{
    url: string;
    at: number;
}

export interface WorkspacePageRow{
    url: string;
    title: string;
    domain: string;
    at: number;
}

export interface WorkspacePageEvent{
    type: 'ws:page';
    workspaceId: string;
    pages: WorkspacePageRow[];
    at: number;
}

export interface WorkspaceSeedEvent{
    type: 'ws:seed';
    workspaceId: string;
    seeds: PublicSeed[];
    at: number;
}

export type RemovedKind = 'page' | 'seed' | 'domain';

export interface RemovedRef{
    id?: string;
    url?: string;
    domain?: string;
}

export interface WorkspaceRemovedEvent extends RemovedRef{
    type: 'ws:removed';
    workspaceId: string;
    kind: RemovedKind;
    at: number;
}

export type CrawlEvent =
    | PageEvent
    | BatchEvent
    | ControlEvent
    | ChangeEvent
    | WorkspacePageEvent
    | WorkspaceSeedEvent
    | WorkspaceRemovedEvent;

export interface RoutableEvent{
    workspaceId?: string;
}
