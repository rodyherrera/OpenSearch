import { NextFunction, RequestHandler, Request, Response } from 'express';

export const filterObject = (object: Record<string, any>, ...fields: string[]): Record<string, any> => {
    return fields.reduce((acc, field) => {
        if(field in object){
            acc[field] = object[field];
        }
        return acc;
    }, {} as Record<string, any>);
};

export const checkIfSlugOrId = (id: string): { _id?: string; slug?: string } => {
    return /^[a-fA-F0-9]{24}$/.test(id) ? { _id: id } : { slug: id };
};

export const catchAsync = (
    asyncFunction: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try{
            await asyncFunction(req, res, next);
        }catch (error){
            next(error);
        }
    };
};
