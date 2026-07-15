import { useState } from 'react';
import { Button, TextField, Input } from '@heroui/react';
import DataTable from '@/shared/components/DataTable';
import { useSearch } from '@/modules/search/hooks/useSearch';
import type { FormEvent } from 'react';
import type { Column } from '@/shared/components/DataTable';
import type { PublicWebsite } from '@/modules/search/contracts/search';

interface Notice{
    tone: 'ok' | 'error';
    text: string;
}

const messageFrom = (error: unknown): string =>
    error instanceof Error ? error.message : 'Something went wrong';

const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const dash = (value?: string): string => (value && value.trim() ? value : '—');

const Search = () => {
    const { query, setQuery, results, loading, loadingMore, searched, hasMore, removing, purging, run, loadMore, remove, purge } = useSearch();
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

    const columns: Column<PublicWebsite>[] = [
        {
            key: 'title',
            header: 'Title',
            value: (row) => row.title ?? row.url,
            cell: (row) => (
                <a
                    href={row.url}
                    target='_blank'
                    rel='noreferrer'
                    className='block truncate font-medium text-primary hover:underline'
                >
                    {row.title ?? row.url}
                </a>
            )
        },
        {
            key: 'url',
            header: 'URL',
            value: (row) => row.url,
            cell: (row) => <span className='block truncate text-muted'>{row.url}</span>
        },
        {
            key: 'description',
            header: 'Description',
            value: (row) => row.description ?? '',
            cell: (row) => <span className='block truncate text-muted'>{dash(row.description)}</span>
        },
        {
            key: 'created',
            header: 'Created',
            width: 'w-44',
            align: 'right',
            sortable: true,
            value: (row) => row.createdAt,
            cell: (row) => <span className='block truncate text-muted'>{formatWhen(row.createdAt)}</span>
        },
        {
            key: 'actions',
            header: '',
            width: 'w-28',
            align: 'right',
            cell: (row) => (
                <Button
                    variant='secondary'
                    size='sm'
                    className='text-danger'
                    isPending={removing}
                    onPress={() => void onDelete(row)}
                >
                    Delete
                </Button>
            )
        }
    ];

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
                <p className={`text-sm ${notice.tone === 'error' ? 'text-danger' : 'text-muted'}`}>
                    {notice.text}
                </p>
            ) : null}

            {searched || loading ? (
                <DataTable
                    columns={columns}
                    rows={results}
                    rowKey={(row) => row.id}
                    loading={loading}
                    emptyLabel={`No results for “${query}”.`}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={() => void loadMore()}
                />
            ) : (
                <p className='text-sm text-muted'>Enter a query to search the crawled index.</p>
            )}

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
                    className='self-start text-danger'
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
