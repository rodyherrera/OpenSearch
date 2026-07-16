import { Button } from '@heroui/react';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Forbidden = () => {
    const navigate = useNavigate();

    return (
        <main className='flex min-h-dvh items-center justify-center bg-background p-4'>
            <section className='flex w-full max-w-sm flex-col items-center text-center'>
                <span className='flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger'>
                    <ShieldAlert className='size-6' aria-hidden='true' />
                </span>

                <h1 className='mt-5 text-lg font-medium text-foreground'>Access denied</h1>
                <p className='mt-2 text-sm text-muted'>
                    You don&apos;t have permission to view this page.
                </p>

                <Button
                    className='mt-7 bg-accent text-accent-foreground hover:bg-accent-hover'
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

export default Forbidden;
