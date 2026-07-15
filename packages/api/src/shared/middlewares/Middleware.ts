import { FastifyReply, FastifyRequest } from 'fastify';
import ClassMetadata from '@/core/utils/ClassMetadata';
import { MiddlewareBinding } from '@/shared/contracts/middleware';

export type MiddlewareFn = (req: FastifyRequest, reply: FastifyReply) => void | Promise<void>;

const bindingsByController = new ClassMetadata<MiddlewareBinding>();

export const Middleware = (...middleware: MiddlewareFn[]): ClassDecorator & MethodDecorator => {
    return (target: object, handlerName?: string | symbol) => {
        const ctor = handlerName === undefined ? target : target.constructor;

        for(const fn of middleware){
            bindingsByController.append(ctor, { handlerName: handlerName ?? null, middleware: fn });
        }
    };
};

export const getMiddleware = (ctor: object, handlerName: string | symbol): MiddlewareFn[] => {
    const bindings = bindingsByController.get(ctor);
    const appliesTo = (binding: MiddlewareBinding): boolean =>
        binding.handlerName === null || binding.handlerName === handlerName;

    return bindings
        .filter(appliesTo)
        .sort((a, b) => Number(a.handlerName !== null) - Number(b.handlerName !== null))
        .map((binding) => binding.middleware);
};

export const getClassMiddleware = (ctor: object): MiddlewareFn[] => {
    return bindingsByController.get(ctor)
        .filter((binding) => binding.handlerName === null)
        .map((binding) => binding.middleware);
};
