import _ from 'lodash';
import Website from '@/modules/website/models/Website';
import type { FilterQuery, SortOrder } from 'mongoose';
import type { WebsiteDocument } from '@/modules/website/models/Website';

type SortSpec = Record<string, SortOrder | { $meta: string }>;
import type { SearchParams, SearchResponse, SearchResult } from '@/modules/search/contracts/domain/search';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Searches the crawled index and returns results in a stable, Firecrawl-compatible
// shape (url/title/description/position) so an agent can swap providers with no code
// changes. The `newerThan` filter is the differentiator — query by index freshness.
export default class PublicSearchService{
    async search(params: SearchParams): Promise<SearchResponse>{
        const q = params.q?.trim() ?? '';
        const limit = Math.min(Math.max(parseInt(params.limit ?? '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const page = Math.max(parseInt(params.page ?? '', 10) || 1, 1);
        const skip = (page - 1) * limit;
        const withContent = params.content === 'true';

        const filter: FilterQuery<WebsiteDocument> = {};
        if(params.newerThan){
            const since = new Date(params.newerThan);
            if(!Number.isNaN(since.getTime())) filter.createdAt = { $gte: since };
        }

        // Text relevance when a query is present; otherwise newest-first over the
        // (optionally freshness-filtered) index.
        let sort: SortSpec = { createdAt: -1 };
        if(q){
            filter.$text = { $search: _.escapeRegExp(q) };
            sort = { score: { $meta: 'textScore' } };
        }

        const select = withContent ? '-markdown' : '-markdown -content';
        const [docs, total] = await Promise.all([
            Website.find(filter, q ? { score: { $meta: 'textScore' } } : {})
                .select(select)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean<WebsiteDocument[]>(),
            Website.countDocuments(filter)
        ]);

        const results: SearchResult[] = docs.map((doc, i) => ({
            url: doc.url,
            title: doc.title ?? '',
            description: doc.description ?? '',
            position: skip + i + 1,
            ...(withContent ? { content: doc.content ?? '' } : {})
        }));

        return { query: q, total, results };
    }
}
