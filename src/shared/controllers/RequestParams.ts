import { createParamDecorator } from './params';
import { parseId } from './parseId';

export const Body = (): ParameterDecorator => createParamDecorator((req) => req.body);

export const NumericParam = (name: string): ParameterDecorator =>
    createParamDecorator((req) => parseId((req.params as Record<string, string>)[name]));

export const Query = (name?: string): ParameterDecorator =>
    createParamDecorator((req) =>
        name === undefined ? req.query : (req.query as Record<string, string>)[name]);

export const NumericQuery = (name: string): ParameterDecorator =>
    createParamDecorator((req) => parseId((req.query as Record<string, string>)[name]));
