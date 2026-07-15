import ClassMetadata from '@/core/utils/ClassMetadata';
import { HttpMethod, RouteDefinition } from '@/shared/contracts/routing';

const routesByController = new ClassMetadata<RouteDefinition>();

export const Route = (path: string, method: string = 'GET'): MethodDecorator => {
    return (target, handlerName) => {
        routesByController.append(target.constructor, {
            path,
            method: method.toUpperCase() as HttpMethod,
            handlerName
        });
    };
};

export const getRoutes = (ctor: object): RouteDefinition[] => {
    return routesByController.get(ctor);
};
