import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Document, Model } from 'mongoose';
import { catchAsync, filterObject, checkIfSlugOrId } from '@utilities/runtime';
import APIFeatures from '@utilities/apiFeatures';
import RuntimeError from '@utilities/runtimeError';

interface HandlerFactoryOptions{
    model: Model<any>;
    fields?: string[];
};

class HandlerFactory{
    private model: Model<any>;
    private fields: string[];

    constructor({ model, fields = [] }: HandlerFactoryOptions){
        this.model = model;
        this.fields = fields;
    };

    deleteOne = (): RequestHandler => catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const databaseRecord = await this.model.findOneAndDelete(checkIfSlugOrId(req.params.id));
        if(!databaseRecord){
            return next(new RuntimeError('Core::DeleteOne::RecordNotFound', 404));
        }
        res.status(204).json({
            status: 'success', 
            data: databaseRecord 
        });
    });

    updateOne = (): RequestHandler => catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const queryFilter = filterObject(req.body, ...this.fields);
        const databaseRecord = await this.model.findOneAndUpdate(
            checkIfSlugOrId(req.params.id),
            queryFilter,
            { new: true, runValidators: true });
        if(!databaseRecord){
            return next(new RuntimeError('Core::UpdateOne::RecordNotFound', 404));
        }
        res.status(200).json({
            status: 'success',
            data: databaseRecord
        });
    });

    createOne = (): RequestHandler => catchAsync(async (req: Request, res: Response) => {
        const queryFilter = filterObject(req.body, ...this.fields);
        const databaseRecord = await this.model.create(queryFilter);
        res.status(201).json({
            status: 'success',
            data: databaseRecord
        });
    });

    getPopulateFromRequest = (requestQuery: Request['query']): string | null => {
        if(!requestQuery?.populate) return null;
        const populate = requestQuery.populate as string;
        return populate.startsWith('{')
            ? JSON.parse(populate).join(' ')
            : populate.split(',').join(' ');
    };

    getAll = (): RequestHandler => catchAsync(async (req: Request, res: Response) => {
        const populate = this.getPopulateFromRequest(req.query);
        const operations = (await new APIFeatures({
            requestQueryString: req.query,
            model: this.model,
            fields: this.fields,
            populate
        }));
        operations.filter().sort().limitFields().search().paginate();
        const { records, skippedResults, totalResults, page, limit, totalPages } = await operations.perform();
        res.status(200).json({
            status: 'success',
            page: {
                current: page,
                total: totalPages
            },
            results: {
                skipped: skippedResults,
                total: totalResults,
                paginated: limit
            },
            data: records
        });
    });

    getOne = (): RequestHandler => catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const populate = this.getPopulateFromRequest(req.query);
        let databaseRecord: Document<any, {}> | null = await this.model.findOne(checkIfSlugOrId(req.params.id));
        if(!databaseRecord){
            return next(new RuntimeError('Core::GetOne::RecordNotFound', 404));
        }
        if(populate){
            databaseRecord = await databaseRecord.populate(populate);
        }
        res.status(200).json({
            status: 'success',
            data: databaseRecord
        });
    });
};

export default HandlerFactory;