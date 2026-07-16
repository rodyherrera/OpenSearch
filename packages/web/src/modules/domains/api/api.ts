import { alova } from '@/app/alova';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';
import type { Scope } from '@/shared/components/ui/ScopeToggle';

const BASE = '/website';

export const domainsApi = {
    // Aggregated from the page index itself, so it always matches /pages.
    list: (scope?: Scope) => alova.Get<{ domains: IndexedDomain[] }>(`${BASE}/domains`, {
        params: scope ? { scope } : {}
    }),
    purge: (domain: string) => alova.Post<{ deleted: number }>(`${BASE}/purge`, { domain })
};
