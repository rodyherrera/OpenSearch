import Website from '@/modules/website/models/Website';
import WebsiteService from '@/modules/website/services/WebsiteService';
import SearchIndexService from '@/modules/search/services/SearchIndexService';
import type { FilterQuery } from 'mongoose';
import type { WebsiteDocument } from '@/modules/website/models/Website';
import type { SearchParams, SearchResponse, SearchResult } from '@/modules/search/contracts/domain/search';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Firecrawl-compatible search: url/title/description/position. Text queries use the
// search engine; plain listing (optionally filtered by freshness) reads Mongo.
export default class PublicSearchService{
    #index = new SearchIndexService();
    #websites = new WebsiteService();

    async search(params: SearchParams): Promise<SearchResponse>{
        const q = params.q?.trim() ?? '';
        const limit = Math.min(Math.max(parseInt(params.limit ?? '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const page = Math.max(parseInt(params.page ?? '', 10) || 1, 1);
        const skip = (page - 1) * limit;
        const withContent = params.content === 'true';
        const select = withContent ? '-markdown' : '-markdown -content';

        const { urls, total } = q
            ? await this.#index.query({ q, newerThan: params.newerThan, page, limit })
            : await this.#listMongo(params.newerThan, skip, limit);

        const docs = await this.#websites.findByUrlsOrdered(urls, select);
        const results: SearchResult[] = docs.map((doc, i) => ({
            url: doc.url,
            title: doc.title ?? '',
            description: doc.description ?? '',
            position: skip + i + 1,
            ...(withContent ? { content: doc.content ?? '' } : {})
        }));

        return { query: q, total, results };
    }

    async #listMongo(newerThan: string | undefined, skip: number, limit: number): Promise<{ urls: string[]; total: number }>{
        const filter: FilterQuery<WebsiteDocument> = {};
        if(newerThan){
            const since = new Date(newerThan);
            if(!Number.isNaN(since.getTime())) filter.createdAt = { $gte: since };
        }
        const [docs, total] = await Promise.all([
            Website.find(filter).select('url').sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Array<{ url: string }>>(),
            Website.countDocuments(filter)
        ]);
        return { urls: docs.map((doc) => doc.url), total };
    }
}
