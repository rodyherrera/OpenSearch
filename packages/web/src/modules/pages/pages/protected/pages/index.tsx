import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import DataTable from '@/shared/components/DataTable';
import { usePages } from '@/modules/pages/hooks/usePages';
import type { Column } from '@/shared/components/DataTable';
import type { PublicWebsite } from '@/modules/pages/contracts/page';

const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

const dash = (value?: string): string => (value && value.trim() ? value : '—');

const messageFrom = (error: unknown): string =>
    error instanceof Error ? error.message : 'Something went wrong';

const Pages = () => {
    const { items, loading, loaded, hasMore, loadMore, query, removing, remove } = usePages();
    const [error, setError] = useState<string | null>(null);

    const onDelete = async (site: PublicWebsite) => {
        const label = site.title ?? site.url;
        if(!window.confirm(`Delete “${label}” from the index?`)) return;
        setError(null);
        try{
            await remove(site.id);
        }catch(err){
            setError(messageFrom(err));
        }
    };

    const columns: Column<PublicWebsite>[] = [
        {
            key: 'title',
            header: 'Title',
            value: (row) => row.title ?? row.url,
            cell: (row) => <span className='block truncate text-foreground'>{row.title ?? row.url}</span>
        },
        {
            key: 'url',
            header: 'URL',
            value: (row) => row.url,
            cell: (row) => (
                <a
                    href={row.url}
                    target='_blank'
                    rel='noreferrer'
                    className='block truncate text-primary hover:underline'
                >
                    {row.url}
                </a>
            )
        },
        {
            key: 'description',
            header: 'Description',
            value: (row) => row.description ?? '',
            cell: (row) => <span className='block truncate text-muted'>{dash(row.description)}</span>
        },
        {
            key: 'keywords',
            header: 'Keywords',
            width: 'w-48',
            value: (row) => row.keywords ?? '',
            cell: (row) => <span className='block truncate text-muted'>{dash(row.keywords)}</span>
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
            key: 'updated',
            header: 'Updated',
            width: 'w-44',
            align: 'right',
            sortable: true,
            value: (row) => row.updatedAt,
            cell: (row) => <span className='block truncate text-muted'>{formatWhen(row.updatedAt)}</span>
        },
        {
            key: 'actions',
            header: '',
            width: 'w-16',
            align: 'right',
            cell: (row) => (
                <button
                    type='button'
                    onClick={() => void onDelete(row)}
                    disabled={removing}
                    aria-label={`Delete ${row.title ?? row.url}`}
                    className='text-muted transition-colors hover:text-danger disabled:opacity-50'
                >
                    <Trash2 className='size-4' />
                </button>
            )
        }
    ];

    return (
        <div className='flex flex-col gap-3'>
            <DataTable
                title='Pages'
                subtitle={query ? `Pages matching “${query}”.` : 'Every page in the index, newest first.'}
                columns={columns}
                rows={items}
                rowKey={(row) => row.id}
                loading={!loaded}
                emptyLabel={query ? 'No pages match your search' : 'No pages indexed yet'}
                initialSort={{ key: 'created', dir: 'desc' }}
                hasMore={hasMore}
                loadingMore={loading}
                onLoadMore={() => void loadMore()}
            />
            {error ? <p className='text-sm text-danger'>{error}</p> : null}
        </div>
    );
};

export default Pages;
