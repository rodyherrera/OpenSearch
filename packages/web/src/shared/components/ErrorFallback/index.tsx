import { Button, ScrollShadow } from '@heroui/react';
import { TriangleAlert } from 'lucide-react';
import type { ErrorFallbackProps } from '@/shared/contracts/boundary';

const ErrorFallback = ({ error, reset }: ErrorFallbackProps) => {
    return (
        <main className='flex min-h-dvh items-center justify-center bg-background p-4'>
            <section className='flex w-full max-w-sm flex-col items-center text-center'>
                <span className='flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger'>
                    <TriangleAlert className='size-6' aria-hidden='true' />
                </span>

                <h1 className='mt-5 text-lg font-medium text-foreground'>Something went wrong</h1>
                <p className='mt-2 text-sm text-muted'>
                    An unexpected error interrupted this page. You can try again, or reload if the problem persists.
                </p>

                {import.meta.env.DEV && (
                    <ScrollShadow className='mt-5 max-h-64 w-full rounded-md bg-surface p-3'>
                        <pre className='text-left text-xs text-muted'>
                            {error.message}
                            {error.stack ? `\n\n${error.stack}` : ''}
                        </pre>
                    </ScrollShadow>
                )}

                <div className='mt-7 flex w-full flex-col gap-2.5'>
                    <Button
                        fullWidth
                        size='md'
                        className='bg-accent text-accent-foreground hover:bg-accent-hover'
                        onPress={reset}
                    >
                        Try again
                    </Button>

                    <Button
                        variant='secondary'
                        fullWidth
                        size='md'
                        onPress={() => window.location.reload()}
                    >
                        Reload
                    </Button>
                </div>
            </section>
        </main>
    );
};

export default ErrorFallback;
