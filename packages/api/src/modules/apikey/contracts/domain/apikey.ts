import type { BaseFields } from '@/shared/models/BaseModel';

export interface ApiKeyFields{
    name: string;
    // Display-only fragments so a key is recognisable in the UI without exposing it.
    prefix: string;
    last4: string;
    lastUsedAt?: string;
    requestCount: number;
}

export type PublicApiKey = ApiKeyFields & BaseFields;

// Returned exactly once, at creation time — the only moment the plaintext key exists.
export interface CreatedApiKey extends PublicApiKey{
    key: string;
}

// The verified identity behind an API-key request, handed to the rate limiter and
// usage recorder.
export interface VerifiedKey{
    id: string;
}
