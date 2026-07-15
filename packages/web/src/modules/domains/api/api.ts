import { alova } from '@/app/alova';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';

const BASE = '/website';

export const domainsApi = {
    // Aggregated from the page index itself, so it always matches /pages.
    list: () => alova.Get<{ domains: IndexedDomain[] }>(`${BASE}/domains`),
    purge: (domain: string) => alova.Post<{ deleted: number }>(`${BASE}/purge`, { domain })
};
