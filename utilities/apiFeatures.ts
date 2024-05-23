import { Document, Model, PopulateOptions } from 'mongoose';
import RuntimeError from '@utilities/runtimeError';

interface RequestQueryString{
    search?: string,
    page?: string,
    sort?: string,
    limit?: string,
    fields?: string,
    populate?: PopulateOptions,
    [key: string]: any;
};

interface Buffer{
    find: any[];
    sort: any;
    select: string;
    skip: number;
    limit: number;
    totalResults: number;
    skippedResults: number;
    page: number;
    totalPages: number;
};

interface Options{
    requestQueryString: RequestQueryString,
    model: Model<Document>;
    populate?: string | PopulateOptions | (string | PopulateOptions)[] | null;
};

class APIFeatures{
    private model: Model<Document>;
    private requestQueryString: RequestQueryString;
    private populate: string | PopulateOptions | (string | PopulateOptions)[] | null;
    private buffer: Buffer;

    constructor({ requestQueryString, model, populate = null }: Options){
        this.model = model;
        this.requestQueryString = requestQueryString;
        this.populate = populate;
        this.buffer = {
            find: [],
            sort: {},
            select: '',
            skip: 0,
            limit: 0,
            totalResults: 0,
            skippedResults: 0,
            page: 1,
            totalPages: 1
        };
    }

    async perform(): Promise<{
        records: Document[];
        totalResults: number;
        skippedResults: number;
        page: number;
        limit: number;
        totalPages: number;
    }>{
        const { find, sort, select, skip, limit, totalResults, skippedResults, page, totalPages } = this.buffer;
        const query = this.model.find(find).skip(skip).limit(limit).sort(sort).select(select);
        if(this.populate){
            if(typeof this.populate === 'string' || Array.isArray(this.populate)){
                query.populate(this.populate as string | string[]);
            }else{
                query.populate(this.populate as PopulateOptions);
            }
        }
        const records = await query;
        return { records, totalResults, skippedResults, page, limit, totalPages };
    };

    search(): APIFeatures{
        if(this.requestQueryString.search){
            const escapedTerm = this.requestQueryString.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedTerm, 'i');
            const query = { suggest: { $regex: regex } };
            this.buffer.find.push(query);
        }
        return this;
    };

    filter(): APIFeatures{
        const query = { ...this.requestQueryString };
        ['page', 'sort', 'limit', 'fields', 'populate'].forEach((element) => delete query[element]);
        const filter = JSON.parse(JSON.stringify(query).replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`));
        this.buffer.find.push(filter);
        return this;
    };

    sort(): APIFeatures{
        this.buffer.sort = (this.requestQueryString.sort)
            ? this.requestQueryString.sort.split(',').join(' ')
            : '-createdAt';
        return this;
    };

    limitFields(): APIFeatures{
        if(this.requestQueryString.fields){
            this.buffer.select = this.requestQueryString.fields.split(',').join(' ');
        }
        return this;
    };

    async paginate(): Promise<APIFeatures>{
        const limit = this.requestQueryString.limit ? parseInt(this.requestQueryString.limit, 10) : 100;
        if(limit === -1) return this;
        const page = this.requestQueryString.page ? parseInt(this.requestQueryString.page, 10) : 1;
        const skip = (page - 1) * limit;
        this.buffer.skip = skip;
        this.buffer.limit = limit;
        const recordsCount = await this.model.countDocuments();
        this.buffer.totalResults = recordsCount;
        this.buffer.page = page;
        this.buffer.skippedResults = skip;
        this.buffer.totalPages = Math.ceil(recordsCount / limit);
        if(this.requestQueryString.page && skip >= recordsCount){
            throw new RuntimeError('Core::PageOutOfRange', 404);
        }
        return this;
    };
};

export default APIFeatures;