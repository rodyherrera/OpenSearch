import Website from '@models/website';
import HandlerFactory from '@controllers/handlerFactory';
import { RequestHandler } from 'express';

const WebsiteFactory = new HandlerFactory({
    model: Website,
    fields: [
        'url',
        'title',
        'description',
        'metaData'
    ]
});

export const getWebsites: RequestHandler = WebsiteFactory.getAll();