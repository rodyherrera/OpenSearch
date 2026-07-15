import { useEffect, useMemo, useState } from 'react';
import { useRequest } from 'alova/client';
import { queueApi } from '@/modules/queue/api/api';

const PAGE_SIZE = 50;

export interface UseQueue{
    urls: string[];
    loading: boolean;
    error: Error | undefined;
    refresh: () => void;
    query: string;
    setQuery: (value: string) => void;
    hasMore: boolean;
    loadMore: () => void;
}

// The queue endpoint returns a bounded frontier sample in one shot, so search and
// pagination are handled client-side over that sample.
export const useQueue = (): UseQueue => {
    // force: true so a manual refresh always bypasses the shared 30s GET cache.
    const { data, loading, error, send } = useRequest(queueApi.sample, { force: true });
    const [query, setQuery] = useState('');
    const [visible, setVisible] = useState(PAGE_SIZE);

    const filtered = useMemo(() => {
        const all = data?.urls ?? [];
        const term = query.trim().toLowerCase();
        return term ? all.filter((url) => url.toLowerCase().includes(term)) : all;
    }, [data, query]);

    useEffect(() => { setVisible(PAGE_SIZE); }, [query]);

    return {
        urls: filtered.slice(0, visible),
        loading,
        error,
        refresh: () => { send(); },
        query,
        setQuery,
        hasMore: visible < filtered.length,
        loadMore: () => setVisible((current) => current + PAGE_SIZE)
    };
};
