export interface AddSeedsInput{
    urls: string[];
}

export interface AddSeedsResult{
    saved: number;
    enqueued: number;
}

export interface PublicSeed{
    id: string;
    url: string;
    domain: string;
    createdAt: string;
    updatedAt: string;
}
