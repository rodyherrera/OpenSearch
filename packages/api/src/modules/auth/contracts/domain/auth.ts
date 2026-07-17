export interface Principal{
    userId: string;
    apiKeyId?: string;
}

export interface PublicAdmin{
    id: string;
    email: string;
    role: 'admin' | 'member';
    createdAt?: string;
    updatedAt?: string;
}
