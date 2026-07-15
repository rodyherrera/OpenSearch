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

export type CrawlEvent = PageEvent | BatchEvent | ControlEvent;
