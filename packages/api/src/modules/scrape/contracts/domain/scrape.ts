export interface ScrapeBody{
    url?: string;
    // Serve from the index if the cached copy is younger than this many ms. 0 forces
    // a live fetch. Omitted → the server default (config.publicApi.scrapeCacheMaxAgeMs).
    maxAge?: number;
    // Consult robots.txt before a live fetch (default false — explicit user intent).
    respectRobots?: boolean;
    includeLinks?: boolean;
}

export interface ScrapeMetadata{
    title: string;
    description: string;
    keywords: string;
    sourceURL: string;
    [key: string]: string;
}

export interface ScrapeResult{
    url: string;
    markdown: string;
    metadata: ScrapeMetadata;
    links?: string[];
    // Whether the result was served from the crawled index (true) or freshly
    // fetched live (false).
    cached: boolean;
}
