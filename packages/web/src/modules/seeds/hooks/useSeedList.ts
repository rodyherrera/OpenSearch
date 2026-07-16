import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { seedsApi } from '@/modules/seeds/api/api';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type { PublicSeed } from '@/modules/seeds/contracts/seeds';

const LIMIT = 40;

export interface UseSeedList{
    items: PublicSeed[];
    loading: boolean;
    loaded: boolean;
    hasMore: boolean;
    query: string;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    removing: boolean;
    remove: (id: string) => Promise<void>;
}

export const useSeedList = (): UseSeedList => {
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    const activeWorkspace = useWorkspaceStore((state) => state.activeId);

    const [items, setItems] = useState<PublicSeed[]>([]);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetcher = useRequest((next: number, q: string) => seedsApi.list(next, LIMIT, q), { immediate: false, force: true });
    const remover = useRequest((id: string) => seedsApi.remove(id), { immediate: false });

    const fetchPage = async (next: number, q: string) => {
        const data = (await fetcher.send(next, q)) ?? [];
        setItems((prev) => (next === 1 ? data : [...prev, ...data]));
        setPage(next);
        setHasMore(data.length === LIMIT);
        setLoaded(true);
    };

    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;
    useEffect(() => {
        void fetchPageRef.current(1, query);
    }, [query, activeWorkspace]);

    const loadMore = async () => {
        if(fetcher.loading || !hasMore) return;
        await fetchPage(page + 1, query);
    };

    const refresh = async () => {
        await fetchPage(1, query);
    };

    const remove = async (id: string) => {
        await remover.send(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    return {
        items,
        loading: fetcher.loading,
        loaded,
        hasMore,
        query,
        loadMore,
        refresh,
        removing: remover.loading,
        remove
    };
};
