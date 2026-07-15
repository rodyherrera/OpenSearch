import type { BaseFields } from '@/shared/models/BaseModel';

export interface WebsitePageRecord{
    url: string;
    title: string;
    description: string;
    keywords: string;
    content: string;
    metaData: Record<string, string>;
}

export interface WebsiteFields{
    url: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    metaData?: Record<string, unknown>;
}

export type PublicWebsite = WebsiteFields & BaseFields;
