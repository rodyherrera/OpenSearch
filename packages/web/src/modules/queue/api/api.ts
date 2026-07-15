import { alova } from '@/app/alova';
import type { QueueSample } from '@/modules/queue/contracts/queue';

const BASE = '/crawler';

export const queueApi = {
    sample: () => alova.Get<QueueSample>(`${BASE}/queue`)
};
