export interface MapBody{
    url?: string;
    // Optional substring filter over discovered URLs.
    search?: string;
    limit?: number;
    // Include the index's known URLs for the domain, not just live sitemap/links.
    includeIndex?: boolean;
}

export interface MapResponse{
    url: string;
    total: number;
    links: string[];
}
