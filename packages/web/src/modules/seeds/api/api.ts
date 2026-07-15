import { alova } from '@/app/alova';
import type { AddSeedsInput } from '@/modules/seeds/contracts/seeds';

const BASE = '/crawler';

export const seedsApi = {
    add: (body: AddSeedsInput) => alova.Post<{ added: number }>(`${BASE}/seeds`, body)
};
