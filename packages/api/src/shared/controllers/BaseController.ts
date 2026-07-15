import { FastifyInstance, RouteHandlerMethod, preHandlerHookHandler } from 'fastify';
import { getRoutes } from './Route';
import { getStatus } from './Status';
import { getParamResolvers } from './params';
import { getMiddleware } from '@/shared/middlewares/Middleware';

export default abstract class BaseController{
    async register(app: FastifyInstance, prefix: string): Promise<void> {
        await app.register(async (scope) => {
            for(const route of getRoutes(this.constructor)){
                const handler = this.#wrap(route.handlerName);
                const middlewares = getMiddleware(this.constructor, route.handlerName);
                scope.route({
                    method: route.method,
                    url: route.path,
                    preHandler: middlewares.map((mw): preHandlerHookHandler => async (req, reply) => { await mw(req, reply); }),
                    handler
                });
            }
        }, { prefix });
    }

    #wrap(handlerName: string | symbol): RouteHandlerMethod{
        const methods = this as unknown as Record<string | symbol, (...args: unknown[]) => unknown>;
        const method = methods[handlerName].bind(this);
        const override = getStatus(this.constructor, handlerName);
        const resolvers = getParamResolvers(this.constructor, handlerName);

        return async (req, reply) => {
            const args = await Promise.all(resolvers.map((resolve) => resolve(req, reply)));
            const result = await method(...args);

            if(result === undefined || result === null){
                reply.status(override ?? 204).send();
                return reply;
            }

            reply.status(override ?? 200).send({ data: result });
            return reply;
        };
    }
}
