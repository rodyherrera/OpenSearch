import { alova } from '@/app/alova';
import type { PublicWebsite } from '@/modules/pages/contracts/page';

const BASE = '/website';

export const pagesApi = {
    list: (page: number, limit: number, q?: string) =>
        alova.Get<PublicWebsite[]>(BASE, { params: { page, limit, ...(q ? { q } : {}) } }),
    remove: (id: string) => alova.Delete<void>(`${BASE}/${id}`)
};
