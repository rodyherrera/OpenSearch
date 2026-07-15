import { FastifyReply, FastifyRequest } from 'fastify';

export type ParamResolver = (req: FastifyRequest, reply?: FastifyReply) => unknown;

export interface ParamBinding{
    handlerName: string | symbol;
    index: number;
    resolve: ParamResolver;
}
