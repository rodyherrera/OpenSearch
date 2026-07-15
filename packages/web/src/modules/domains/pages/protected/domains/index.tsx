import DataTable from '@/shared/components/DataTable';
import { useDomains } from '@/modules/domains/hooks/useDomains';
import type { Column } from '@/shared/components/DataTable';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';

const columns: Column<IndexedDomain>[] = [
    {
        key: 'domain',
        header: 'Domain',
        sortable: true,
        value: (row) => row.domain,
        cell: (row) => <span className='block truncate text-foreground'>{row.domain}</span>
    },
    {
        key: 'pages',
        header: 'Pages',
        width: 'w-40',
        align: 'right',
        sortable: true,
        value: (row) => row.pages,
        cell: (row) => row.pages.toLocaleString()
    }
];

const Domains = () => {
    const { domains, loading, error, refresh, query, setQuery, hasMore, loadMore } = useDomains();

    return (
        <DataTable
            title='Domains'
            subtitle='Registrable domains in the index, by page count.'
            columns={columns}
            rows={domains}
            rowKey={(row) => row.domain}
            loading={loading}
            error={error}
            onRefresh={refresh}
            search={{ value: query, onChange: setQuery, placeholder: 'Filter domains…' }}
            emptyLabel='No domains indexed yet'
            initialSort={{ key: 'pages', dir: 'desc' }}
            hasMore={hasMore}
            onLoadMore={loadMore}
        />
    );
};

export default Domains;
