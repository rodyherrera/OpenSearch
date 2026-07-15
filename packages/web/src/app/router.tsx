import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { discoverRoutes } from '@/app/routes';
import { lazyElement } from '@/app/lazyElement';
import type { DiscoveredRoute, RouteTier } from '@/shared/contracts/routing/route';
import GuestGuard from '@/shared/components/routing/GuestGuard';
import ProtectedGuard from '@/shared/components/routing/ProtectedGuard';
import AdminGuard from '@/shared/components/routing/AdminGuard';
import RouteErrorBoundary from '@/shared/components/routing/RouteErrorBoundary';
import NotFound from '@/shared/components/routing/NotFound';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';

const toRoutes = (list: DiscoveredRoute[]): RouteObject[] =>
    list.map((route) => {
        const path = route.path.replace(/^\//, '');
        return path === ''
            ? { index: true, element: lazyElement(route.load) }
            : { path, element: lazyElement(route.load) };
    });

const discovered = discoverRoutes();
const byTier = (tier: RouteTier): DiscoveredRoute[] => discovered.filter((route) => route.tier === tier);

const children: RouteObject[] = [];

const guest = toRoutes(byTier('guest'));
if(guest.length) children.push({ element: <GuestGuard />, children: guest });

const protectedChildren = toRoutes(byTier('protected'));
const admin = toRoutes(byTier('admin'));
if(admin.length) protectedChildren.push({ element: <AdminGuard />, children: admin });
if(protectedChildren.length){
    children.push({
        element: <ProtectedGuard />,
        children: [{ element: <DashboardLayout />, children: protectedChildren }],
    });
}

children.push({ path: '*', element: <NotFound /> });

export const router = createBrowserRouter([
    { element: <RouteErrorBoundary />, children },
]);
