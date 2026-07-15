import { useEffect, useRef, useState } from 'react';
import { useRequest } from 'alova/client';
import { pagesApi } from '@/modules/pages/api/api';
import type { PublicWebsite } from '@/modules/pages/contracts/page';

const LIMIT = 40;
const SEARCH_DEBOUNCE_MS = 300;

export interface UsePages{
    items: PublicWebsite[];
    loading: boolean;
    loaded: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    query: string;
    setQuery: (value: string) => void;
}

export const usePages = (): UsePages => {
    const [items, setItems] = useState<PublicWebsite[]>([]);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [query, setQuery] = useState('');

    const fetcher = useRequest((next: number, q: string) => pagesApi.list(next, LIMIT, q), { immediate: false });

    const fetchPage = async (next: number, q: string) => {
        try{
            const data = (await fetcher.send(next, q)) ?? [];
            setItems((prev) => (next === 1 ? data : [...prev, ...data]));
            setPage(next);
            setHasMore(data.length === LIMIT);
        }catch{
            // Over-paging (or a transient failure): stop paginating rather than surface a 404.
            if(next === 1) setItems([]);
            setHasMore(false);
        }finally{
            setLoaded(true);
        }
    };

    // Re-fetch from page 1 whenever the (debounced) query changes; also runs once on mount.
    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;
    useEffect(() => {
        const term = query.trim();
        const handle = setTimeout(() => { void fetchPageRef.current(1, term); }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [query]);

    const loadMore = async () => {
        if(fetcher.loading || !hasMore) return;
        await fetchPage(page + 1, query.trim());
    };

    return {
        items,
        loading: fetcher.loading,
        loaded,
        hasMore,
        loadMore,
        query,
        setQuery
    };
};
