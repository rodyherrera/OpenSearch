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
    saved: number;
    enqueued: number;
}
