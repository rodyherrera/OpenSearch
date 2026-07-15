import type { ComponentType } from 'react';

export type RouteTier = 'guest' | 'protected' | 'admin';

export interface PageModule{
    default: ComponentType;
}

export type PageLoader = () => Promise<PageModule>;

export interface ParsedRoute{
    tier: RouteTier;
    path: string;
}

export interface DiscoveredRoute extends ParsedRoute{
    load: PageLoader;
}
