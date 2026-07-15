import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import type { PageLoader } from '@/shared/contracts/routing/route';
import RouteLoader from '@/shared/components/routing/RouteLoader';

export const lazyElement = (load: PageLoader): ReactElement => {
    const Page = lazy(load);
    return (
        <Suspense fallback={<RouteLoader />}>
            <Page />
        </Suspense>
    );
};
