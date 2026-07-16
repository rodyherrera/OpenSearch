export interface MeiliWebsiteDoc{
    id: string;
    url: string;
    domain: string;
    title: string;
    description: string;
    keywords: string;
    content: string;
    workspaces: string[];
    createdAt: number;
}

export type MeiliContentPatch = Pick<MeiliWebsiteDoc, 'id' | 'title' | 'description' | 'keywords' | 'content'>;

export interface IndexQuery{
    q?: string;
    workspaceId?: string;
    newerThan?: string;
    page: number;
    limit: number;
}

export interface IndexQueryResult{
    urls: string[];
    total: number;
}
