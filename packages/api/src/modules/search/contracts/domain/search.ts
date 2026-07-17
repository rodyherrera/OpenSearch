export interface SearchParams{
    q?: string;
    limit?: string;
    page?: string;
    content?: string;
    newerThan?: string;
}

export interface SearchResult{
    url: string;
    title: string;
    description: string;
    position: number;
    content?: string;
}

export interface SearchResponse{
    query: string;
    total: number;
    results: SearchResult[];
}
