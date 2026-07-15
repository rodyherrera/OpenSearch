import { useState } from 'react';
import { Button, TextField, Input } from '@heroui/react';
import { useSearch } from '@/modules/search/hooks/useSearch';
import type { FormEvent } from 'react';
import type { PublicWebsite } from '@/modules/search/contracts/search';

interface Notice{
    tone: 'ok' | 'error';
    text: string;
}

const messageFrom = (error: unknown): string =>
    error instanceof Error ? error.message : 'Something went wrong';

const Search = () => {
    const { query, setQuery, results, loading, searched, removing, purging, run, remove, purge } = useSearch();
    const [domain, setDomain] = useState('');
    const [notice, setNotice] = useState<Notice | null>(null);

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        setNotice(null);
        void run();
    };

    const onDelete = async (site: PublicWebsite) => {
        const label = site.title ?? site.url;
        if(!window.confirm(`Delete “${label}” from the index?`)) return;
        try{
            await remove(site.id);
            setNotice({ tone: 'ok', text: `Removed “${label}”.` });
        }catch(error){
            setNotice({ tone: 'error', text: messageFrom(error) });
        }
    };

    const onPurgeDomain = async (event: FormEvent) => {
        event.preventDefault();
        const target = domain.trim();
        if(!target) return;
        try{
            const deleted = await purge({ domain: target });
            setDomain('');
            setNotice({ tone: 'ok', text: `Removed ${deleted} page(s) for ${target}.` });
        }catch(error){
            setNotice({ tone: 'error', text: messageFrom(error) });
        }
    };

    const onPurgeAll = async () => {
        if(!window.confirm('Purge the ENTIRE index? This cannot be undone.')) return;
        try{
            const deleted = await purge({ all: true });
            setNotice({ tone: 'ok', text: `Purged the index (${deleted} page(s) removed).` });
        }catch(error){
            setNotice({ tone: 'error', text: messageFrom(error) });
        }
    };

    return (
        <div className='flex flex-col gap-6'>
            <header>
                <h1 className='text-lg font-medium'>Search</h1>
                <p className='text-sm text-muted'>Query the crawled index and manage what it stores.</p>
            </header>

            <form onSubmit={onSearch} className='flex items-center gap-2'>
                <TextField
                    aria-label='Search query'
                    value={query}
                    onChange={setQuery}
                    className='flex-1'
                >
                    <Input placeholder='Search the index…' />
                </TextField>
                <Button type='submit' variant='secondary' size='md' isPending={loading}>
                    Search
                </Button>
            </form>

            {notice ? (
                <p className={`text-sm ${notice.tone === 'error' ? 'text-[var(--danger)]' : 'text-muted'}`}>
                    {notice.text}
                </p>
            ) : null}

            <section>
                {loading ? (
                    <p className='text-sm text-muted'>Searching…</p>
                ) : searched ? (
                    results.length === 0 ? (
                        <p className='text-sm text-muted'>No results for “{query}”.</p>
                    ) : (
                        <ul className='flex flex-col gap-3'>
                            {results.map((site) => (
                                <li
                                    key={site.id}
                                    className='rounded-lg border border-foreground/10 p-4'
                                >
                                    <div className='flex items-start justify-between gap-4'>
                                        <div className='min-w-0'>
                                            <a
                                                href={site.url}
                                                target='_blank'
                                                rel='noreferrer'
                                                className='text-sm font-medium text-primary hover:underline'
                                            >
                                                {site.title ?? site.url}
                                            </a>
                                            <p className='truncate text-xs text-muted'>{site.url}</p>
                                            {site.description ? (
                                                <p className='mt-1 text-sm text-foreground/80'>
                                                    {site.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        <Button
                                            variant='secondary'
                                            size='sm'
                                            className='shrink-0 text-[var(--danger)]'
                                            isPending={removing}
                                            onPress={() => void onDelete(site)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )
                ) : (
                    <p className='text-sm text-muted'>Enter a query to search the crawled index.</p>
                )}
            </section>

            <section className='flex flex-col gap-3 rounded-lg border border-foreground/10 p-4'>
                <div>
                    <h2 className='text-sm font-medium'>Admin</h2>
                    <p className='text-xs text-muted'>Purge crawled pages by domain or clear the whole index.</p>
                </div>

                <form onSubmit={onPurgeDomain} className='flex items-center gap-2'>
                    <TextField
                        aria-label='Domain to purge'
                        value={domain}
                        onChange={setDomain}
                        className='flex-1'
                    >
                        <Input placeholder='example.com' />
                    </TextField>
                    <Button
                        type='submit'
                        variant='secondary'
                        size='md'
                        isPending={purging}
                        isDisabled={!domain.trim()}
                    >
                        Purge domain
                    </Button>
                </form>

                <Button
                    variant='secondary'
                    size='md'
                    className='self-start text-[var(--danger)]'
                    isPending={purging}
                    onPress={() => void onPurgeAll()}
                >
                    Purge all
                </Button>
            </section>
        </div>
    );
};

export default Search;
