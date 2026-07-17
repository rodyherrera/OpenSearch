export interface MapBody{
    url?: string;
    search?: string;
    limit?: number;
    includeIndex?: boolean;
}

export interface MapResponse{
    url: string;
    total: number;
    links: string[];
}
