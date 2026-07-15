import type { ParsedRoute, RouteTier } from '@/shared/contracts/routing/route';

const ROUTE_FILE = /\/modules\/([^/]+)\/pages\/(guest|protected|admin)\/(.*)index\.tsx$/;

const toKebab = (segment: string): string =>
    segment
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

const toSegment = (raw: string): string => {
    const param = raw.match(/^\[(.+)\]$/);
    if(param) return `:${param[1]}`;
    return toKebab(raw);
};

export const parseRouteFile = (file: string): ParsedRoute => {
    const match = ROUTE_FILE.exec(file);
    if(!match) throw new Error(`Route file does not match the pages convention: ${file}`);

    const [, , tier, rest] = match;
    const segments = rest.split('/').filter(Boolean).map(toSegment);
    const path = segments.length ? `/${segments.join('/')}` : '/';

    return { tier: tier as RouteTier, path };
};
