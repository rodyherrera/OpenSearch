import { useEffect, useMemo, useState } from 'react';
import { useRequest } from 'alova/client';
import { domainsApi } from '@/modules/domains/api/api';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';

const PAGE_SIZE = 50;

export interface DomainsApi{
    domains: IndexedDomain[];
    loading: boolean;
    error: Error | undefined;
    refresh: () => void;
    query: string;
    setQuery: (value: string) => void;
    hasMore: boolean;
    loadMore: () => void;
}

// The API returns a bounded snapshot of indexed domains in one shot, so search and
// pagination are handled client-side: filter the snapshot, then reveal it in chunks
// as the user scrolls.
export const useDomains = (): DomainsApi => {
    // force: true so a refresh always bypasses the shared 30s GET cache.
    const { data, loading, error, send } = useRequest(domainsApi.list, { force: true });
    const [query, setQuery] = useState('');
    const [visible, setVisible] = useState(PAGE_SIZE);

    const filtered = useMemo(() => {
        const all = data?.domains ?? [];
        const term = query.trim().toLowerCase();
        return term ? all.filter((entry) => entry.domain.toLowerCase().includes(term)) : all;
    }, [data, query]);

    // Collapse the reveal window back to the first chunk whenever the filter changes.
    useEffect(() => { setVisible(PAGE_SIZE); }, [query]);

    return {
        domains: filtered.slice(0, visible),
        loading,
        error,
        refresh: () => { send(); },
        query,
        setQuery,
        hasMore: visible < filtered.length,
        loadMore: () => setVisible((current) => current + PAGE_SIZE)
    };
};
