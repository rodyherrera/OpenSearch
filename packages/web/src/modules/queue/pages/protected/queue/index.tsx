import DataTable from '@/shared/components/DataTable';
import { useQueue } from '@/modules/queue/hooks/useQueue';
import type { Column } from '@/shared/components/DataTable';

interface QueueEntry{
    position: number;
    url: string;
}

const hostOf = (url: string): string => {
    try{
        return new URL(url).hostname;
    }catch{
        return '—';
    }
};

const columns: Column<QueueEntry>[] = [
    { key: 'position', header: '#', width: 'w-20', align: 'right', value: (row) => row.position },
    {
        key: 'domain',
        header: 'Domain',
        width: 'w-72',
        sortable: true,
        value: (row) => hostOf(row.url),
        cell: (row) => <span className='block truncate text-foreground'>{hostOf(row.url)}</span>
    },
    {
        key: 'url',
        header: 'URL',
        sortable: true,
        value: (row) => row.url,
        cell: (row) => <span className='block truncate text-muted'>{row.url}</span>
    }
];

const Queue = () => {
    const { urls, loading, error, refresh, query, setQuery, hasMore, loadMore } = useQueue();
    const rows: QueueEntry[] = urls.map((url, index) => ({ position: index + 1, url }));

    return (
        <DataTable
            title='Queue'
            subtitle='URLs waiting in the crawl frontier (sampled).'
            columns={columns}
            rows={rows}
            rowKey={(row) => `${row.position}-${row.url}`}
            loading={loading}
            error={error}
            onRefresh={refresh}
            search={{ value: query, onChange: setQuery, placeholder: 'Filter URLs…' }}
            emptyLabel='Queue is empty'
            hasMore={hasMore}
            onLoadMore={loadMore}
        />
    );
};

export default Queue;
