export type Endpoint = 'search' | 'scrape' | 'map' | 'crawl';

export interface SearchResult{
    url: string;
    title: string;
    description: string;
    position: number;
}

export interface SearchResponse{
    query: string;
    total: number;
    results: SearchResult[];
}

export interface ScrapeResult{
    url: string;
    markdown: string;
    metadata: Record<string, string>;
    cached: boolean;
}

export interface MapResponse{
    url: string;
    total: number;
    links: string[];
}

export interface CrawlStatus{
    id: string;
    url: string;
    domain: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
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
    metadata: { title: string; description: string; sourceURL: string };
}

export interface CrawlResults{
    id: string;
    status: CrawlStatus['status'];
    total: number;
    page: number;
    limit: number;
    data: CrawlResultPage[];
}
