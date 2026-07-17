import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import DataTable from '@/shared/components/DataTable';
import ScopeToggle, { type Scope } from '@/shared/components/ui/ScopeToggle';
import { useDomains } from '@/modules/domains/hooks/useDomains';
import { useWorkspaceLive } from '@/shared/hooks/live/useWorkspaceLive';
import type { ReactNode } from 'react';
import type { Column } from '@/shared/components/DataTable';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';

interface Notice{
    tone: 'ok' | 'error';
    text: string;
}

const messageFrom = (error: unknown): string => (error instanceof Error ? error.message : 'Something went wrong');

const baseColumns: Column<IndexedDomain>[] = [
    { key: 'domain', header: 'Domain', sortable: true, value: (row) => row.domain, cell: (row) => <span className='block truncate text-foreground'>{row.domain}</span> },
    { key: 'pages', header: 'Pages', width: 'w-40', align: 'right', sortable: true, value: (row) => row.pages, cell: (row) => row.pages.toLocaleString() }
];

// Workspace scope streams from the shared live store (always in sync with the crawler).
const WorkspaceDomains = ({ filters }: { filters: ReactNode }) => {
    const { domains, hydrated } = useWorkspaceLive();
    const [searchParams, setSearchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim().toLowerCase();
    const setQuery = (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true });

    const rows = useMemo(() => (query ? domains.filter((entry) => entry.domain.toLowerCase().includes(query)) : domains), [domains, query]);

    return (
        <DataTable
            title='Domains'
            subtitle='Registrable domains in this workspace, by page count.'
            search={{ value: searchParams.get('q') ?? '', onChange: setQuery, placeholder: 'Filter domains…' }}
            filters={filters}
            columns={baseColumns}
            rows={rows}
            rowKey={(row) => row.domain}
            loading={!hydrated}
            emptyLabel={query ? 'No domains match your filter' : 'No domains indexed yet'}
            initialSort={{ key: 'pages', dir: 'desc' }}
        />
    );
};

// Global scope is the whole shared corpus — REST + admin purge.
const GlobalDomains = ({ filters }: { filters: ReactNode }) => {
    const { domains, loading, error, refresh, query, hasMore, loadMore, purging, purgeDomain } = useDomains('global');
    const [, setSearchParams] = useSearchParams();
    const [notice, setNotice] = useState<Notice | null>(null);
    const setQuery = (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true });

    const onPurge = async (row: IndexedDomain) => {
        if(!window.confirm(`Purge every indexed page for “${row.domain}”? This cannot be undone.`)) return;
        setNotice(null);
        try{
            const deleted = await purgeDomain(row.domain);
            setNotice({ tone: 'ok', text: `Removed ${deleted.toLocaleString()} page(s) for ${row.domain}.` });
        }catch(err){
            setNotice({ tone: 'error', text: messageFrom(err) });
        }
    };

    const columns: Column<IndexedDomain>[] = [
        ...baseColumns,
        {
            key: 'actions',
            header: '',
            width: 'w-16',
            align: 'right',
            cell: (row) => (
                <button type='button' onClick={() => void onPurge(row)} disabled={purging} aria-label={`Purge ${row.domain}`}
                    className='text-muted transition-colors hover:text-danger disabled:opacity-50'>
                    <Trash2 className='size-4' />
                </button>
            )
        }
    ];

    return (
        <DataTable
            title='Domains'
            subtitle='Registrable domains in the global index, by page count.'
            search={{ value: query, onChange: setQuery, placeholder: 'Filter domains…' }}
            filters={filters}
            columns={columns}
            rows={domains}
            rowKey={(row) => row.domain}
            loading={loading}
            error={error}
            onRefresh={refresh}
            emptyLabel={query ? 'No domains match your filter' : 'No domains indexed yet'}
            initialSort={{ key: 'pages', dir: 'desc' }}
            hasMore={hasMore}
            onLoadMore={loadMore}
            notice={notice ? <p className={`text-sm ${notice.tone === 'error' ? 'text-danger' : 'text-muted'}`}>{notice.text}</p> : null}
        />
    );
};

const Domains = () => {
    const [scope, setScope] = useState<Scope>('workspace');
    const toggle = <ScopeToggle value={scope} onChange={setScope} />;
    return scope === 'workspace' ? <WorkspaceDomains filters={toggle} /> : <GlobalDomains filters={toggle} />;
};

export default Domains;
