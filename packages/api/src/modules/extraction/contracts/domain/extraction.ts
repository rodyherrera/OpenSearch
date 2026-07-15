// The shape produced by parsing one fetched HTML document. Shared by the massive
// crawler (which stores a subset) and the on-demand scrape/crawl endpoints (which
// return the full markdown). Keeping it in one place means every consumer sees the
// same fields regardless of how the fetch was triggered.
export interface ParsedPage{
    url: string;
    title: string;
    description: string;
    keywords: string;
    // First N chars of visible body text — cheap, used for full-text indexing.
    content: string;
    // Full page rendered as clean Markdown (LLM-ready). Absent when parsing
    // was asked to skip it (the massive crawler doesn't need it per page).
    markdown?: string;
    metaData: Record<string, string>;
    // Outbound links, already normalized and split external-first.
    links: string[];
}

export interface ParseOptions{
    // Cap on external links harvested from the page.
    maxExternalLinks?: number;
    // Cap on same-domain links harvested from the page.
    maxInternalLinks?: number;
    // Whether to render full Markdown (skipped by the massive crawler for speed).
    withMarkdown?: boolean;
    // How many chars of body text to keep in `content`.
    contentChars?: number;
}
