import { useEffect, useRef, useState } from 'react';
import { useRequest } from 'alova/client';
import { seedsApi } from '@/modules/seeds/api/api';
import type { PublicSeed } from '@/modules/seeds/contracts/seeds';

const LIMIT = 40;

export interface UseSeedList{
    items: PublicSeed[];
    loading: boolean;
    loaded: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

export const useSeedList = (): UseSeedList => {
    const [items, setItems] = useState<PublicSeed[]>([]);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // force: true so a refresh after adding seeds bypasses the shared 30s GET cache.
    const fetcher = useRequest((next: number) => seedsApi.list(next, LIMIT), { immediate: false, force: true });

    const fetchPage = async (next: number) => {
        const data = (await fetcher.send(next)) ?? [];
        setItems((prev) => (next === 1 ? data : [...prev, ...data]));
        setPage(next);
        setHasMore(data.length === LIMIT);
        setLoaded(true);
    };

    // Run the first fetch once on mount; the ref keeps the effect free of reactive deps.
    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;
    useEffect(() => {
        void fetchPageRef.current(1);
    }, []);

    const loadMore = async () => {
        if(fetcher.loading || !hasMore) return;
        await fetchPage(page + 1);
    };

    const refresh = async () => {
        await fetchPage(1);
    };

    return {
        items,
        loading: fetcher.loading,
        loaded,
        hasMore,
        loadMore,
        refresh
    };
};
