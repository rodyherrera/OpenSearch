import { NextFunction, RequestHandler, Request, Response } from 'express';
import _ from 'lodash';

export const filterObject = (object: Record<string, any>, ...fields: string[]): Record<string, any> => {
    return _.pick(object, fields);
};

export const normalizeUrl = (src: string, baseUrl: string): string | null => {
    try{
        if(!src.startsWith('http://') && !src.startsWith('https://')){
            return new URL(src, baseUrl).href;
        }
        return src;
    }catch(error){
        return null;
    }
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
