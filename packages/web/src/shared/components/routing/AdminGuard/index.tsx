import { Outlet } from 'react-router-dom';
import { useSession } from '@/shared/hooks/routing/useSession';
import RouteLoader from '@/shared/components/routing/RouteLoader';
import Forbidden from '@/shared/components/routing/Forbidden';

// Composes on top of ProtectedGuard via route nesting: authentication is already enforced by the
// parent, so this only adds the admin check.
const AdminGuard = () => {
    const { isAdmin, isLoading } = useSession();

    if(isLoading) return <RouteLoader />;
    if(!isAdmin) return <Forbidden />;
    return <Outlet />;
};

export default AdminGuard;
