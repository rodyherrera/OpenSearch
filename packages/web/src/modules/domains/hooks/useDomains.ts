import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    hasMore: boolean;
    loadMore: () => void;
    purging: boolean;
    purgeDomain: (domain: string) => Promise<number>;
}

// The API returns a bounded snapshot of indexed domains in one shot, so search and
// pagination are handled client-side: filter the snapshot, then reveal it in chunks
// as the user scrolls. The filter comes from the URL (?q=), written by the
// layout-level search bar.
export const useDomains = (): DomainsApi => {
    // force: true so a refresh always bypasses the shared 30s GET cache.
    const { data, loading, error, send } = useRequest(domainsApi.list, { force: true });
    const purger = useRequest((domain: string) => domainsApi.purge(domain), { immediate: false });
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    const [visible, setVisible] = useState(PAGE_SIZE);

    const filtered = useMemo(() => {
        const all = data?.domains ?? [];
        const term = query.toLowerCase();
        return term ? all.filter((entry) => entry.domain.toLowerCase().includes(term)) : all;
    }, [data, query]);

    // Collapse the reveal window back to the first chunk whenever the filter changes.
    useEffect(() => { setVisible(PAGE_SIZE); }, [query]);

    const purgeDomain = async (domain: string): Promise<number> => {
        const { deleted } = await purger.send(domain);
        send();
        return deleted;
    };

    return {
        domains: filtered.slice(0, visible),
        loading,
        error,
        refresh: () => { send(); },
        query,
        hasMore: visible < filtered.length,
        loadMore: () => setVisible((current) => current + PAGE_SIZE),
        purging: purger.loading,
        purgeDomain
    };
};
