import { config } from '@/shared/config';
import { fetchHtml } from '@/shared/http/HttpClient';
import RobotsGuard from '@/modules/crawler/services/RobotsGuard';

export interface FetchPageOptions{
    timeoutMs?: number;
    respectRobots?: boolean;
}

export default class PageFetcher{
    #robots = new RobotsGuard();

    async fetch(url: string, options: FetchPageOptions = {}): Promise<string | null>{
        const { timeoutMs = config.crawler.timeoutMs, respectRobots = false } = options;
        if(respectRobots && !(await this.#robots.isAllowed(url))) return null;
        const html = await fetchHtml(url, { timeoutMs });
        return html || null;
    }
}
