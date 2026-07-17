export interface ScrapeBody{
    url?: string;
    maxAge?: number;
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
    cached: boolean;
}
