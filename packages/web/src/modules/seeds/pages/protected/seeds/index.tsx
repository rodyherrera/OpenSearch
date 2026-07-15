import { useState } from 'react';
import { Button } from '@heroui/react';
import { useSeeds } from '@/modules/seeds/hooks/useSeeds';
import type { ChangeEvent, FormEvent } from 'react';

const Seeds = () => {
    const [value, setValue] = useState('');
    const [emptyError, setEmptyError] = useState(false);
    const { submit, adding, added, error } = useSeeds();

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if(value.trim().length === 0){
            setEmptyError(true);
            return;
        }
        setEmptyError(false);
        submit(value);
    };

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setValue(event.target.value);
        if(emptyError) setEmptyError(false);
    };

    return (
        <div className='mx-auto flex w-full max-w-2xl flex-col gap-4'>
            <header className='flex flex-col gap-1'>
                <h1 className='text-lg font-medium text-foreground'>Seed URLs</h1>
                <p className='text-sm text-muted'>
                    One URL per line; they'll be normalized and enqueued into the crawl frontier.
                </p>
            </header>

            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
                <textarea
                    rows={10}
                    value={value}
                    onChange={handleChange}
                    disabled={adding}
                    placeholder='https://example.com'
                    className='w-full rounded-lg border border-foreground/10 bg-surface-secondary p-3 text-sm'
                />

                {emptyError ? (
                    <p role='alert' className='text-sm text-danger'>Enter at least one URL.</p>
                ) : null}

                {error ? (
                    <p role='alert' className='text-sm text-danger'>{error.message}</p>
                ) : null}

                {added !== null ? (
                    <p className='text-sm text-success'>Added {added} URLs to the frontier.</p>
                ) : null}

                <Button
                    type='submit'
                    size='md'
                    className='self-start bg-foreground text-background hover:bg-foreground/90'
                    isPending={adding}
                >
                    Add to frontier
                </Button>
            </form>
        </div>
    );
};

export default Seeds;
