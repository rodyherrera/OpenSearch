import { searchWebsite } from '@models/website';
import { Request, Response, NextFunction } from 'express';

export const search = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const searchTerm = req.query?.q;
    if(!searchTerm){
        next();
        return;
    }
    const results = await searchWebsite(searchTerm);
    res.status(200).json({
        status: 'success',
        data: results
    });
};