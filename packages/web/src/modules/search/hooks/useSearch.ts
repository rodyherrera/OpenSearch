import { useState } from 'react';
import { useRequest } from 'alova/client';
import { searchApi } from '@/modules/search/api/api';
import type { PublicWebsite, PurgeInput } from '@/modules/search/contracts/search';

export interface UseSearch{
    query: string;
    setQuery: (value: string) => void;
    results: PublicWebsite[];
    loading: boolean;
    searched: boolean;
    removing: boolean;
    purging: boolean;
    run: (next?: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    purge: (body: PurgeInput) => Promise<number>;
}

export const useSearch = (): UseSearch => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicWebsite[]>([]);
    const [searched, setSearched] = useState(false);

    const finder = useRequest((q: string) => searchApi.search(q), { immediate: false });
    const remover = useRequest((id: string) => searchApi.remove(id), { immediate: false });
    const purger = useRequest((body: PurgeInput) => searchApi.purge(body), { immediate: false });

    const run = async (next?: string) => {
        const term = (next ?? query).trim();
        setQuery(term);
        if(!term){
            setResults([]);
            setSearched(false);
            return;
        }
        const data = await finder.send(term);
        setResults(data ?? []);
        setSearched(true);
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
        }
        return deleted;
    };

    return {
        query,
        setQuery,
        results,
        loading: finder.loading,
        searched,
        removing: remover.loading,
        purging: purger.loading,
        run,
        remove,
        purge
    };
};
