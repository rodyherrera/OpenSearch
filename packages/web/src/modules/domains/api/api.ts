import { alova } from '@/app/alova';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';

const BASE = '/crawler';

export const domainsApi = {
    list: () => alova.Get<{ domains: IndexedDomain[] }>(`${BASE}/domains`)
};
