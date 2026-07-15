export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteDefinition{
    path: string;
    method: HttpMethod;
    handlerName: string | symbol;
}
