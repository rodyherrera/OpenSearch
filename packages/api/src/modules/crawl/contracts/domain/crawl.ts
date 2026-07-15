import type { CrawlJobStatus } from '@/modules/crawl/models/CrawlJob';

export interface CreateCrawlBody{
    url?: string;
    // Max pages to scrape (clamped server-side). Default 50, max 500.
    limit?: number;
    respectRobots?: boolean;
    // Called with the finished job when the crawl reaches a terminal state.
    webhookUrl?: string;
}

// Compact status view — never includes the (potentially large) page URL list.
export interface CrawlJobStatusView{
    id: string;
    url: string;
    domain: string;
    status: CrawlJobStatus;
    limit: number;
    total: number;
    error?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

export interface CrawlResultPage{
    url: string;
    markdown: string;
    metadata: {
        title: string;
        description: string;
        sourceURL: string;
    };
}

export interface CrawlResultsView{
    id: string;
    status: CrawlJobStatus;
    total: number;
    page: number;
    limit: number;
    data: CrawlResultPage[];
}
