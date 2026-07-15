import { useState } from 'react';
import { useRequest } from 'alova/client';
import { searchApi } from '@/modules/search/api/api';
import type { PublicWebsite, PurgeInput } from '@/modules/search/contracts/search';

const LIMIT = 20;

export interface UseSearch{
    query: string;
    setQuery: (value: string) => void;
    results: PublicWebsite[];
    loading: boolean;
    loadingMore: boolean;
    searched: boolean;
    hasMore: boolean;
    removing: boolean;
    purging: boolean;
    run: (next?: string) => Promise<void>;
    loadMore: () => Promise<void>;
    remove: (id: string) => Promise<void>;
    purge: (body: PurgeInput) => Promise<number>;
}

export const useSearch = (): UseSearch => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicWebsite[]>([]);
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const finder = useRequest((q: string, next: number) => searchApi.search(q, next), { immediate: false });
    const remover = useRequest((id: string) => searchApi.remove(id), { immediate: false });
    const purger = useRequest((body: PurgeInput) => searchApi.purge(body), { immediate: false });

    const run = async (next?: string) => {
        const term = (next ?? query).trim();
        setQuery(term);
        setPage(1);
        if(!term){
            setResults([]);
            setSearched(false);
            setHasMore(false);
            return;
        }
        const data = (await finder.send(term, 1)) ?? [];
        setResults(data);
        setHasMore(data.length === LIMIT);
        setSearched(true);
    };

    const loadMore = async () => {
        const term = query.trim();
        if(!term || finder.loading || loadingMore || !hasMore) return;
        const next = page + 1;
        setLoadingMore(true);
        try{
            const data = (await finder.send(term, next)) ?? [];
            setResults((prev) => [...prev, ...data]);
            setPage(next);
            setHasMore(data.length === LIMIT);
        }catch{
            // Over-paging past the last full page: just stop.
            setHasMore(false);
        }finally{
            setLoadingMore(false);
        }
    };

    const remove = async (id: string) => {
        await remover.send(id);
        setResults((prev) => prev.filter((item) => item.id !== id));
    };

    const purge = async (body: PurgeInput): Promise<number> => {
        const { deleted } = await purger.send(body);
        const term = query.trim();
        if(term){
            await run(term);
        }else{
            setResults([]);
            setSearched(false);
            setHasMore(false);
        }
        return deleted;
    };

    return {
        query,
        setQuery,
        results,
        loading: finder.loading && !loadingMore,
        loadingMore,
        searched,
        hasMore,
        removing: remover.loading,
        purging: purger.loading,
        run,
        loadMore,
        remove,
        purge
    };
};
