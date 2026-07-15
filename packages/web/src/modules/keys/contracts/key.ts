export interface ApiKey{
    id: string;
    name: string;
    prefix: string;
    last4: string;
    requestCount: number;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// Returned only at creation — the one time the plaintext key is available.
export interface CreatedApiKey extends ApiKey{
    key: string;
}
