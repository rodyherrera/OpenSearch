import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { domainsApi } from '@/modules/domains/api/api';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';
import type { Scope } from '@/shared/components/ui/ScopeToggle';

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

export const useDomains = (scope: Scope): DomainsApi => {
    const { data, loading, error, send } = useRequest((s: Scope) => domainsApi.list(s), { immediate: false, force: true });
    const purger = useRequest((domain: string) => domainsApi.purge(domain), { immediate: false });
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    const activeWorkspace = useWorkspaceStore((state) => state.activeId);
    const [visible, setVisible] = useState(PAGE_SIZE);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void send(scope); }, [scope, activeWorkspace]);

    const filtered = useMemo(() => {
        const all = data?.domains ?? [];
        const term = query.toLowerCase();
        return term ? all.filter((entry) => entry.domain.toLowerCase().includes(term)) : all;
    }, [data, query]);

    useEffect(() => { setVisible(PAGE_SIZE); }, [query, scope]);

    const purgeDomain = async (domain: string): Promise<number> => {
        const { deleted } = await purger.send(domain);
        void send(scope);
        return deleted;
    };

    return {
        domains: filtered.slice(0, visible),
        loading,
        error,
        refresh: () => { void send(scope); },
        query,
        hasMore: visible < filtered.length,
        loadMore: () => setVisible((current) => current + PAGE_SIZE),
        purging: purger.loading,
        purgeDomain
    };
};
