import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useSession } from '@/shared/hooks/routing/useSession';
import RouteLoader from '@/shared/components/routing/RouteLoader';

const GuestGuard = () => {
    const { isAuthenticated, isLoading } = useSession();
    const [params] = useSearchParams();

    if(isLoading) return <RouteLoader />;
    if(isAuthenticated){
        const next = params.get('next');
        // Only allow site-relative targets — reject protocol-relative '//host' open redirects.
        const to = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
        return <Navigate to={to} replace />;
    }
    return <Outlet />;
};

export default GuestGuard;
