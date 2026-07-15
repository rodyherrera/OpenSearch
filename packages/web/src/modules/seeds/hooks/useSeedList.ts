import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { seedsApi } from '@/modules/seeds/api/api';
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
}

export const useSeedList = (): UseSeedList => {
    // The filter lives in the URL (?q=), written by the layout-level search bar.
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();

    const [items, setItems] = useState<PublicSeed[]>([]);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // force: true so a refresh after adding seeds bypasses the shared 30s GET cache.
    const fetcher = useRequest((next: number, q: string) => seedsApi.list(next, LIMIT, q), { immediate: false, force: true });

    const fetchPage = async (next: number, q: string) => {
        const data = (await fetcher.send(next, q)) ?? [];
        setItems((prev) => (next === 1 ? data : [...prev, ...data]));
        setPage(next);
        setHasMore(data.length === LIMIT);
        setLoaded(true);
    };

    // Re-fetch from page 1 whenever the URL query changes; also runs once on mount.
    // The search bar already debounces its URL writes, so no debounce here.
    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;
    useEffect(() => {
        void fetchPageRef.current(1, query);
    }, [query]);

    const loadMore = async () => {
        if(fetcher.loading || !hasMore) return;
        await fetchPage(page + 1, query);
    };

    const refresh = async () => {
        await fetchPage(1, query);
    };

    return {
        items,
        loading: fetcher.loading,
        loaded,
        hasMore,
        query,
        loadMore,
        refresh
    };
};
