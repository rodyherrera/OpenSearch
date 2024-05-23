import Suggest from '@models/suggest';
import HandlerFactory from '@controllers/handlerFactory';
import { RequestHandler } from 'express';

const SuggestFactory = new HandlerFactory({
    model: Suggest,
    fields: ['suggest']
});

export const getSuggests: RequestHandler = SuggestFactory.getAll();