import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/shared/hooks/routing/useSession';
import RouteLoader from '@/shared/components/routing/RouteLoader';

const ProtectedGuard = () => {
    const { isAuthenticated, isLoading } = useSession();
    const location = useLocation();

    if(isLoading) return <RouteLoader />;
    if(!isAuthenticated){
        const next = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/sign-in?next=${next}`} replace />;
    }
    return <Outlet />;
};

export default ProtectedGuard;
