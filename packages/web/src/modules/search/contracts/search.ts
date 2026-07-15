export interface PublicWebsite{
    id: string;
    url: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    metaData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface PurgeInput{
    domain?: string;
    all?: boolean;
}
