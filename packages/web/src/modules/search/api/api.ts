import { alova } from '@/app/alova';
import type { PublicWebsite, PurgeInput } from '@/modules/search/contracts/search';

const BASE = '/website';

export const searchApi = {
    search: (q: string, limit = 20) => alova.Get<PublicWebsite[]>(BASE, { params: { q, limit } }),
    remove: (id: string) => alova.Delete<void>(`${BASE}/${id}`),
    purge: (body: PurgeInput) => alova.Post<{ deleted: number }>(`${BASE}/purge`, body)
};
