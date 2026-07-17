import type { BaseFields } from '@/shared/models/BaseModel';

export interface WebsitePageRecord{
    url: string;
    title: string;
    description: string;
    keywords: string;
    content: string;
    metaData: Record<string, string>;
}

// A page captured by the on-demand scrape endpoint — like WebsitePageRecord but
// carrying the rendered markdown that discovery crawling doesn't produce.
export interface ScrapedRecord extends WebsitePageRecord{
    markdown: string;
}

export interface WebsiteFields{
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    markdown?: string;
    metaData?: Record<string, unknown>;
}

export type PublicWebsite = WebsiteFields & BaseFields;

export interface DomainPageCount{
    domain: string;
    pages: number;
}

export interface RefreshResult{
    inserted: string[];
    changed: string[];
}
