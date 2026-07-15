export interface SearchParams{
    q?: string;
    limit?: string;
    page?: string;
    // 'true' to include the indexed content slice on each result.
    content?: string;
    // ISO date; restrict to pages first indexed on or after this instant. This is
    // the freshness angle a general search API can't offer — pages we saw appear.
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
