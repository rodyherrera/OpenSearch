import { alova } from '@/app/alova';
import type { GraphSnapshot } from '@/modules/graph/contracts/graph';

const BASE = '/graph';

export const graphApi = {
    snapshot: () => alova.Get<GraphSnapshot>(BASE)
};
