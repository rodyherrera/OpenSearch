export interface PublicWebsite{
    id: string;
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    metaData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
