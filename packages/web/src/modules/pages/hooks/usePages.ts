import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { pagesApi } from '@/modules/pages/api/api';
import type { PublicWebsite } from '@/modules/pages/contracts/page';

const LIMIT = 40;

export interface UsePages{
    items: PublicWebsite[];
    loading: boolean;
    loaded: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    query: string;
    removing: boolean;
    remove: (id: string) => Promise<void>;
}

export const usePages = (): UsePages => {
    // The query lives in the URL (?q=), written by the layout-level search bar,
    // so results are deep-linkable and survive navigation.
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();

    const [items, setItems] = useState<PublicWebsite[]>([]);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetcher = useRequest((next: number, q: string) => pagesApi.list(next, LIMIT, q), { immediate: false });
    const remover = useRequest((id: string) => pagesApi.remove(id), { immediate: false });

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

    const remove = async (id: string) => {
        await remover.send(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    return {
        items,
        loading: fetcher.loading,
        loaded,
        hasMore,
        loadMore,
        query,
        removing: remover.loading,
        remove
    };
};
