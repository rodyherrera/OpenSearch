import { alova } from '@/app/alova';
import type {
    SearchResponse,
    ScrapeResult,
    MapResponse,
    CrawlStatus,
    CrawlResults
} from '@/modules/playground/contracts/playground';

// cacheFor: 0 on the polled crawl reads so status updates aren't served stale from
// the shared 30s GET cache.
export const playgroundApi = {
    search: (q: string, limit: number) =>
        alova.Get<SearchResponse>('/search', { params: { q, limit } }),
    scrape: (url: string) => alova.Post<ScrapeResult>('/scrape', { url }),
    map: (url: string) => alova.Post<MapResponse>('/map', { url }),
    crawlCreate: (url: string, limit: number) => alova.Post<CrawlStatus>('/crawl', { url, limit }),
    crawlStatus: (id: string) => alova.Get<CrawlStatus>(`/crawl/${id}`, { cacheFor: 0 }),
    crawlResults: (id: string) => alova.Get<CrawlResults>(`/crawl/${id}/results`, { params: { page: 1 }, cacheFor: 0 })
};
