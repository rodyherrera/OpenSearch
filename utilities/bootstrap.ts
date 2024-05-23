import { Application, RequestHandler } from 'express';

interface ConfigureAppParams{
    app: Application;
    routes: string[];
    suffix: string;
    middlewares: RequestHandler[];
};

const formatRoute = (route: string): string => {
    return route.split(/(?=[A-Z])/).join('-').toLowerCase();
};

export const configureApp = async ({ app, routes, suffix, middlewares }: ConfigureAppParams): Promise<void> => {
    middlewares.forEach((middlewares) => app.use(middlewares));
    try{
        const routePromises = routes.map(async (route) => {
            const path = suffix + formatRoute(route);
            const router = await import(`@routes/${route}.ts`);
            if(router.default){
                app.use(path, router.default);
            }else{
                console.error(`The module imported from './routes/${route}' does not have a default export.`);
            }
        });
        await Promise.all(routePromises);
    }catch(error){
        console.error('Open Search -> Error setting up the application routes:', error);
    }
};
