import { LoaderCircle } from 'lucide-react';

const RouteLoader = () => {
    return (
        <div className='flex min-h-dvh items-center justify-center bg-background'>
            <LoaderCircle className='size-6 animate-spin text-muted' aria-label='Loading' />
        </div>
    );
};

export default RouteLoader;
