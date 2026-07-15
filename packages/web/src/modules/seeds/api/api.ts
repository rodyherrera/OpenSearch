import { alova } from '@/app/alova';
import type { AddSeedsInput, AddSeedsResult, PublicSeed } from '@/modules/seeds/contracts/seeds';

const BASE = '/seed';

export const seedsApi = {
    add: (body: AddSeedsInput) => alova.Post<AddSeedsResult>(BASE, body),
    list: (page: number, limit: number) => alova.Get<PublicSeed[]>(BASE, { params: { page, limit } })
};
