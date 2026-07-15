import { useRequest } from 'alova/client';
import { seedsApi } from '@/modules/seeds/api/api';

const parseUrls = (raw: string): string[] =>
    raw
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0 && token.startsWith('http'));

export const useSeeds = () => {
    const request = useRequest(seedsApi.add, { immediate: false });

    const submit = async (raw: string): Promise<void> => {
        const urls = parseUrls(raw);
        if(urls.length === 0) return;
        await request.send({ urls });
    };

    return {
        submit,
        adding: request.loading,
        added: request.data?.added ?? null,
        error: request.error
    };
};
