import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { Trash2 } from 'lucide-react';
import DataTable from '@/shared/components/DataTable';
import AddSeedModal from '@/modules/seeds/components/AddSeedModal';
import { seedsApi } from '@/modules/seeds/api/api';
import { useWorkspaceLive } from '@/shared/hooks/live/useWorkspaceLive';
import { formatWhen } from '@/shared/utils/time';
import type { Column } from '@/shared/components/DataTable';
import type { LiveSeed } from '@/shared/contracts/live';

const Seeds = () => {
    const { seeds, hydrated } = useWorkspaceLive();
    const [searchParams, setSearchParams] = useSearchParams();
    const remover = useRequest((id: string) => seedsApi.remove(id), { immediate: false });

    const query = (searchParams.get('q') ?? '').trim().toLowerCase();
    const setQuery = (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true });

    const rows = useMemo(
        () => (query ? seeds.filter((seed) => seed.url.toLowerCase().includes(query) || seed.domain.toLowerCase().includes(query)) : seeds),
        [seeds, query]
    );

    const onDelete = async (row: LiveSeed) => {
        if(!window.confirm(`Remove seed “${row.url}”? Pages already crawled from it stay indexed.`)) return;
        await remover.send(row.id);
    };

    const columns: Column<LiveSeed>[] = [
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
                    disabled={remover.loading}
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
            search={{ value: searchParams.get('q') ?? '', onChange: setQuery, placeholder: 'Filter seeds…' }}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={!hydrated}
            emptyLabel={query ? 'No seeds match your filter' : 'No seeds added yet'}
            initialSort={{ key: 'added', dir: 'desc' }}
            actions={<AddSeedModal />}
        />
    );
};

export default Seeds;
