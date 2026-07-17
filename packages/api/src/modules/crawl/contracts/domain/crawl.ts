import type { CrawlJobStatus } from '@/modules/crawl/models/CrawlJob';

export interface CreateCrawlBody{
    url?: string;
    limit?: number;
    respectRobots?: boolean;
    webhookUrl?: string;
}

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
