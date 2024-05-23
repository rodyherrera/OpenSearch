import { NextFunction, RequestHandler, Request, Response } from 'express';

export const filterObject = (object: Record<string, any>, ...fields: string[]): Record<string, any> => {
    const filteredObject: Record<string, any> = {};
    Object.keys(object).forEach((key) => {
        if(fields.includes(key)) filteredObject[key] = object[key];
    });
    return filteredObject;
};

export const checkIfSlugOrId = (id: string): { _id?: string; slug?: string } => {
    if(id.length === 24) return { _id: id };
    return { slug: id };
};

export const catchAsync = (
    asyncFunction: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        asyncFunction(req, res, next).catch(next)
    }
};