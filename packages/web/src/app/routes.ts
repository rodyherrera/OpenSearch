import { parseRouteFile } from '@/shared/utils/routing/parseRouteFile';
import type { DiscoveredRoute, PageLoader } from '@/shared/contracts/routing/route';

const modules = import.meta.glob([
    '/src/modules/*/pages/{guest,protected,admin}/index.tsx',
    '/src/modules/*/pages/{guest,protected,admin}/**/index.tsx',
]);

export const discoverRoutes = (): DiscoveredRoute[] => {
    const routes = Object.entries(modules).map(([file, load]) => {
        const { tier, path } = parseRouteFile(file);
        return { tier, path, load: load as PageLoader };
    });

    if(import.meta.env.DEV){
        const seen = new Set<string>();
        for(const route of routes){
            if(seen.has(route.path)){
                throw new Error(`Duplicate route path from folder discovery: ${route.path}`);
            }
            seen.add(route.path);
        }
    }

    return routes;
};
