export interface Principal{
    userId: string;
}

export interface PublicAdmin{
    id: string;
    email: string;
    role: 'admin';
    createdAt?: string;
    updatedAt?: string;
}
