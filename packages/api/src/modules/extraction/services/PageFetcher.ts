import { config } from '@/shared/config';
import { fetchHtml } from '@/shared/http/HttpClient';
import { isAllowed } from '@/modules/crawler/services/RobotsGuard';

export interface FetchPageOptions{
    timeoutMs?: number;
    // When true, consult robots.txt and refuse disallowed URLs (returns null).
    respectRobots?: boolean;
}

// Thin wrapper over the shared HTTP client that also enforces robots.txt. Extracted
// from MassiveCrawler so the on-demand scrape/crawl endpoints fetch through exactly
// the same keep-alive pooled client and politeness rules as the background crawler.
export default class PageFetcher{
    async fetch(url: string, options: FetchPageOptions = {}): Promise<string | null>{
        const { timeoutMs = config.crawler.timeoutMs, respectRobots = false } = options;
        if(respectRobots && !(await isAllowed(url))) return null;
        const html = await fetchHtml(url, { timeoutMs });
        return html || null;
    }
}
