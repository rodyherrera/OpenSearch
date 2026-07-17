export interface ParsedPage{
    url: string;
    title: string;
    description: string;
    keywords: string;
    content: string;
    markdown?: string;
    metaData: Record<string, string>;
    links: string[];
}

export interface ParseOptions{
    maxExternalLinks?: number;
    maxInternalLinks?: number;
    withMarkdown?: boolean;
    contentChars?: number;
}
