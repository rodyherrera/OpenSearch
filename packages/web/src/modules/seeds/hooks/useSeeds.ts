import { useRequest } from 'alova/client';
import { seedsApi } from '@/modules/seeds/api/api';
import type { AddSeedsResult } from '@/modules/seeds/contracts/seeds';

const parseUrls = (raw: string): string[] =>
    raw
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0 && token.startsWith('http'));

export interface UseSeeds{
    submit: (raw: string) => Promise<AddSeedsResult | null>;
    adding: boolean;
    result: AddSeedsResult | null;
    error: Error | undefined;
}

export const useSeeds = (): UseSeeds => {
    const request = useRequest(seedsApi.add, { immediate: false });

    const submit = async (raw: string): Promise<AddSeedsResult | null> => {
        const urls = parseUrls(raw);
        if(urls.length === 0) return null;
        return await request.send({ urls });
    };

    return {
        submit,
        adding: request.loading,
        result: request.data ?? null,
        error: request.error
    };
};
