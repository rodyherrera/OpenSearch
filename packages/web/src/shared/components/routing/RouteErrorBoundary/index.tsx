import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

// Root layout: catches render errors thrown by any page/guard and clears the fallback on
// navigation, since the location key changes the boundary's resetKeys.
const RouteErrorBoundary = () => {
    const location = useLocation();

    return (
        <ErrorBoundary resetKeys={[location.pathname]}>
            <Outlet />
        </ErrorBoundary>
    );
};

export default RouteErrorBoundary;
