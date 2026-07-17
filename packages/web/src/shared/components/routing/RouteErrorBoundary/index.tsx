import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

const RouteErrorBoundary = () => {
    const location = useLocation();

    return (
        <ErrorBoundary resetKeys={[location.pathname]}>
            <Outlet />
        </ErrorBoundary>
    );
};

export default RouteErrorBoundary;
