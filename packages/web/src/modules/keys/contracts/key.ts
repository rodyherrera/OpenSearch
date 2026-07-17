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

export interface CreatedApiKey extends ApiKey{
    key: string;
}
