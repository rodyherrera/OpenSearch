import { Button } from '@heroui/react';
import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <main className='flex min-h-dvh items-center justify-center bg-background p-4'>
            <section className='flex w-full max-w-sm flex-col items-center text-center'>
                <span className='flex size-12 items-center justify-center rounded-full bg-surface-secondary text-muted'>
                    <Compass className='size-6' aria-hidden='true' />
                </span>

                <h1 className='mt-5 text-lg font-medium text-foreground'>Page not found</h1>
                <p className='mt-2 text-sm text-muted'>
                    The page you are looking for doesn&apos;t exist or may have moved.
                </p>

                <Button
                    className='mt-7 bg-foreground text-background hover:bg-foreground/90'
                    fullWidth
                    size='md'
                    onPress={() => navigate('/')}
                >
                    Back to home
                </Button>
            </section>
        </main>
    );
};

export default NotFound;
