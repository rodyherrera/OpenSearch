import _ from 'lodash';
import Website from '@/modules/website/models/Website';
import RuntimeError from '@/shared/errors/RuntimeError';
import { SearchError } from '@/shared/errors/SearchError';
import type { SearchQuery } from '@/modules/website/contracts/http/search';
import type { PublicWebsite } from '@/modules/website/contracts/domain/website';

const RESERVED = ['page', 'sort', 'limit', 'fields', 'populate'];
const FILTERABLE = ['url', 'title', 'description', 'metaData'];

type SortSpec = string | Record<string, { $meta: string }>;

interface QueryBuffer{
    find: Record<string, unknown>;
    sort: SortSpec;
    select: string;
    skip: number;
    limit: number;
}

export default class WebsiteSearchService{
    async search(query: SearchQuery): Promise<PublicWebsite[]>{
        const buffer: QueryBuffer = { find: {}, sort: {}, select: '', skip: 0, limit: 0 };
        this.#filter(query, buffer);
        this.#sort(query, buffer);
        this.#limitFields(query, buffer);
        this.#search(query, buffer);
        await this.#paginate(query, buffer);
        const records = await Website
            .find(buffer.find)
            .skip(buffer.skip)
            .limit(buffer.limit)
            .sort(buffer.sort)
            .select(buffer.select);
        return records.map((record) => record.toJSON() as PublicWebsite);
    }

    #filter(query: SearchQuery, buffer: QueryBuffer): void{
        const rest = _.omit(query as Record<string, unknown>, RESERVED);
        const filter = _.pick(rest, FILTERABLE);
        buffer.find = { ...buffer.find, ...filter };
    }

    #sort(query: SearchQuery, buffer: QueryBuffer): void{
        buffer.sort = query.sort ? query.sort.split(',').join(' ') : '-createdAt';
    }

    #limitFields(query: SearchQuery, buffer: QueryBuffer): void{
        if(query.fields){
            buffer.select = query.fields.split(',').join(' ');
        }
    }

    #search(query: SearchQuery, buffer: QueryBuffer): void{
        if(query.q){
            const escapedTerm = _.escapeRegExp(query.q);
            buffer.sort = { score: { $meta: 'textScore' } };
            buffer.find = { ...buffer.find, $text: { $search: escapedTerm } };
        }
    }

    async #paginate(query: SearchQuery, buffer: QueryBuffer): Promise<void>{
        const limit = query.limit ? parseInt(query.limit, 10) : 100;
        if(limit === -1) return;
        const page = query.page ? parseInt(query.page, 10) : 1;
        const skip = (page - 1) * limit;
        buffer.skip = skip;
        buffer.limit = limit;
        const recordsCount = await Website.countDocuments(buffer.find);
        if(query.page && skip >= recordsCount){
            throw new RuntimeError(SearchError.PageOutOfRange, 404);
        }
    }
}
