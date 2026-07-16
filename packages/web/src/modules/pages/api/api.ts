import { alova } from '@/app/alova';
import type { PublicWebsite } from '@/modules/pages/contracts/page';
import type { Scope } from '@/shared/components/ui/ScopeToggle';

const BASE = '/website';

export const pagesApi = {
    list: (page: number, limit: number, q?: string, scope?: Scope) =>
        alova.Get<PublicWebsite[]>(BASE, { params: { page, limit, ...(q ? { q } : {}), ...(scope ? { scope } : {}) } }),
    remove: (id: string) => alova.Delete<void>(`${BASE}/${id}`)
};
