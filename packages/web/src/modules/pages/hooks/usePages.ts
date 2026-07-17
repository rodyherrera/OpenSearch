import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { pagesApi } from '@/modules/pages/api/api';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type { PublicWebsite } from '@/modules/pages/contracts/page';
import type { Scope } from '@/shared/components/ui/ScopeToggle';

const LIMIT = 40;

export interface UsePages{
    items: PublicWebsite[];
    loading: boolean;
    loaded: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    query: string;
    removing: boolean;
    remove: (id: string) => Promise<void>;
}

export const usePages = (scope: Scope): UsePages => {
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    const activeWorkspace = useWorkspaceStore((state) => state.activeId);

    const [items, setItems] = useState<PublicWebsite[]>([]);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetcher = useRequest((next: number, q: string, s: Scope) => pagesApi.list(next, LIMIT, q, s), { immediate: false });
    const remover = useRequest((id: string) => pagesApi.remove(id), { immediate: false });

    const fetchPage = async (next: number, q: string, s: Scope) => {
        try{
            const data = (await fetcher.send(next, q, s)) ?? [];
            setItems((prev) => (next === 1 ? data : [...prev, ...data]));
            setPage(next);
            setHasMore(data.length === LIMIT);
        }catch{
            if(next === 1) setItems([]);
            setHasMore(false);
        }finally{
            setLoaded(true);
        }
    };

    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;
    useEffect(() => {
        void fetchPageRef.current(1, query, scope);
    }, [query, scope, activeWorkspace]);

    const loadMore = async () => {
        if(fetcher.loading || !hasMore) return;
        await fetchPage(page + 1, query, scope);
    };

    const remove = async (id: string) => {
        await remover.send(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const refresh = () => fetchPage(1, query, scope);

    return {
        items,
        loading: fetcher.loading,
        loaded,
        hasMore,
        loadMore,
        refresh,
        query,
        removing: remover.loading,
        remove
    };
};
