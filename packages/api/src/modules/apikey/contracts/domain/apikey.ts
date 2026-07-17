import type { BaseFields } from '@/shared/models/BaseModel';

export interface ApiKeyFields{
    name: string;
    prefix: string;
    last4: string;
    lastUsedAt?: string;
    requestCount: number;
}

export type PublicApiKey = ApiKeyFields & BaseFields;

export interface CreatedApiKey extends PublicApiKey{
    key: string;
}

export interface VerifiedKey{
    id: string;
}
