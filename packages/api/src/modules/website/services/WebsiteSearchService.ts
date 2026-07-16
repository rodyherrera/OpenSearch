import mongoose from 'mongoose';
import Website from '@/modules/website/models/Website';
import WebsiteService from '@/modules/website/services/WebsiteService';
import SearchIndexService from '@/modules/search/services/SearchIndexService';
import RuntimeError from '@/shared/errors/RuntimeError';
import { SearchError } from '@/shared/errors/SearchError';
import { config } from '@/shared/config';
import type { SearchQuery } from '@/modules/website/contracts/http/search';
import type { PublicWebsite } from '@/modules/website/contracts/domain/website';

export default class WebsiteSearchService{
    #index = new SearchIndexService();
    #websites = new WebsiteService();

    // Text queries hit the search engine (relevance); plain browse/list falls to
    // Mongo, the source of truth, so listings never lag behind the indexer.
    async search(query: SearchQuery, workspaceId?: string): Promise<PublicWebsite[]>{
        if((query.q ?? '').trim()) return this.#searchMeili(query, workspaceId);
        return this.#listMongo(query, workspaceId);
    }

    async #searchMeili(query: SearchQuery, workspaceId?: string): Promise<PublicWebsite[]>{
        const limit = this.#limit(query.limit);
        const page = query.page ? Math.max(parseInt(query.page, 10), 1) : 1;
        const { urls, total } = await this.#index.query({ q: query.q, workspaceId, page, limit });
        if(page > 1 && (page - 1) * limit >= total){
            throw new RuntimeError(SearchError.PageOutOfRange, 404);
        }
        const docs = await this.#websites.findByUrlsOrdered(urls, query.fields ? query.fields.split(',').join(' ') : '-markdown');
        return docs.map((doc) => doc.toJSON() as PublicWebsite);
    }

    async #listMongo(query: SearchQuery, workspaceId?: string): Promise<PublicWebsite[]>{
        const limit = this.#limit(query.limit);
        const page = query.page ? Math.max(parseInt(query.page, 10), 1) : 1;
        const skip = (page - 1) * limit;
        const find: Record<string, unknown> = {};
        if(workspaceId) find.workspaces = new mongoose.Types.ObjectId(workspaceId);

        const total = await Website.countDocuments(find);
        if(page > 1 && skip >= total){
            throw new RuntimeError(SearchError.PageOutOfRange, 404);
        }
        const select = query.fields ? query.fields.split(',').join(' ') : '-markdown';
        const records = await Website.find(find).sort({ createdAt: -1 }).skip(skip).limit(limit).select(select);
        return records.map((record) => record.toJSON() as PublicWebsite);
    }

    #limit(raw?: string): number{
        const limit = raw ? parseInt(raw, 10) : 100;
        if(limit === -1 || limit > config.search.meili.maxTotalHits) return config.search.meili.maxTotalHits;
        return limit > 0 ? limit : 100;
    }
}
