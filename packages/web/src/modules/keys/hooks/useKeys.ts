import { useEffect, useRef, useState } from 'react';
import { useRequest } from 'alova/client';
import { keysApi } from '@/modules/keys/api/api';
import type { ApiKey, CreatedApiKey } from '@/modules/keys/contracts/key';

export interface UseKeys{
    keys: ApiKey[];
    loading: boolean;
    loaded: boolean;
    creating: boolean;
    removing: boolean;
    create: (name: string) => Promise<CreatedApiKey>;
    remove: (id: string) => Promise<void>;
}

export const useKeys = (): UseKeys => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loaded, setLoaded] = useState(false);

    const lister = useRequest(keysApi.list, { immediate: false, force: true });
    const creator = useRequest((name: string) => keysApi.create(name), { immediate: false });
    const remover = useRequest((id: string) => keysApi.remove(id), { immediate: false });

    const refresh = async () => {
        const data = (await lister.send()) ?? [];
        setKeys(data);
        setLoaded(true);
    };

    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    useEffect(() => { void refreshRef.current(); }, []);

    const create = async (name: string): Promise<CreatedApiKey> => {
        const created = await creator.send(name);
        setKeys((prev) => [created, ...prev]);
        return created;
    };

    const remove = async (id: string) => {
        await remover.send(id);
        setKeys((prev) => prev.filter((key) => key.id !== id));
    };

    return {
        keys,
        loading: lister.loading,
        loaded,
        creating: creator.loading,
        removing: remover.loading,
        create,
        remove
    };
};
