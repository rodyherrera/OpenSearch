import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import DataTable from '@/shared/components/DataTable';
import AddSeedModal from '@/modules/seeds/components/AddSeedModal';
import { useSeedList } from '@/modules/seeds/hooks/useSeedList';
import type { Column } from '@/shared/components/DataTable';
import type { PublicSeed } from '@/modules/seeds/contracts/seeds';

const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

const Seeds = () => {
    const list = useSeedList();
    const [, setSearchParams] = useSearchParams();

    const setQuery = (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true });

    const onDelete = async (row: PublicSeed) => {
        if(!window.confirm(`Remove seed “${row.url}”? Pages already crawled from it stay indexed.`)) return;
        await list.remove(row.id);
    };

    const columns: Column<PublicSeed>[] = [
        {
            key: 'url',
            header: 'URL',
            value: (row) => row.url,
            cell: (row) => <span className='block max-w-md truncate text-foreground'>{row.url}</span>
        },
        {
            key: 'domain',
            header: 'Domain',
            sortable: true,
            value: (row) => row.domain,
            cell: (row) => <span className='text-muted'>{row.domain}</span>
        },
        {
            key: 'added',
            header: 'Added',
            align: 'right',
            sortable: true,
            value: (row) => row.createdAt,
            cell: (row) => <span className='whitespace-nowrap text-muted'>{formatWhen(row.createdAt)}</span>
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
                    disabled={list.removing}
                    aria-label={`Remove ${row.url}`}
                    className='text-muted transition-colors hover:text-danger disabled:opacity-50'
                >
                    <Trash2 className='size-4' />
                </button>
            )
        }
    ];

    return (
        <DataTable
            title='Seeds'
            subtitle='Every seed URL saved to the index, newest first.'
            search={{ value: list.query, onChange: setQuery, placeholder: 'Filter seeds…' }}
            columns={columns}
            rows={list.items}
            rowKey={(row) => row.id}
            loading={!list.loaded}
            emptyLabel={list.query ? 'No seeds match your filter' : 'No seeds added yet'}
            initialSort={{ key: 'added', dir: 'desc' }}
            hasMore={list.hasMore}
            loadingMore={list.loading}
            onLoadMore={() => void list.loadMore()}
            actions={<AddSeedModal onAdded={() => void list.refresh()} />}
        />
    );
};

export default Seeds;
