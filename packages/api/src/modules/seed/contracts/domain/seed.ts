import type { BaseFields } from '@/shared/models/BaseModel';

export interface SeedFields{
    url: string;
    domain: string;
}

export type PublicSeed = SeedFields & BaseFields;

export interface AddSeedsBody{
    urls: string[];
}

export interface AddSeedsResult{
    // Seeds persisted for the first time (existing ones are ignored).
    saved: number;
    // Seeds actually pushed into the crawl frontier this call.
    enqueued: number;
}
