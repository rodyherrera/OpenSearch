import { MiddlewareFn } from '@/shared/middlewares/Middleware';

export interface MiddlewareBinding{
    handlerName: string | symbol | null;
    middleware: MiddlewareFn;
}
