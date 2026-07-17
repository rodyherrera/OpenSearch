import { alova } from '@/app/alova';
import type { AddSeedsInput, AddSeedsResult } from '@/modules/seeds/contracts/seeds';

const BASE = '/seed';

export const seedsApi = {
    add: (body: AddSeedsInput) => alova.Post<AddSeedsResult>(BASE, body),
    remove: (id: string) => alova.Delete<void>(`${BASE}/${id}`)
};
