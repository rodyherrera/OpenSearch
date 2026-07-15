import { alova } from '@/app/alova';
import type { Tuning, ControlState, CrawlerStatus } from '@/modules/crawler/contracts/crawler';

const BASE = '/crawler';

export const crawlerApi = {
    status: () => alova.Get<CrawlerStatus>(`${BASE}/status`),
    getControl: () => alova.Get<ControlState>(`${BASE}/control`),
    patchControl: (body: Partial<Tuning> & { paused?: boolean }) =>
        alova.Patch<ControlState>(`${BASE}/control`, body),
    pause: () => alova.Post<{ paused: true }>(`${BASE}/pause`),
    resume: () => alova.Post<{ paused: false }>(`${BASE}/resume`)
};
