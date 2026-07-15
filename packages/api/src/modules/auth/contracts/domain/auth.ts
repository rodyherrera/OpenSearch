export interface Principal{
    userId: string;
    // Set when the request authenticated with an API key rather than a JWT.
    apiKeyId?: string;
}

export interface PublicAdmin{
    id: string;
    email: string;
    role: 'admin';
    createdAt?: string;
    updatedAt?: string;
}
