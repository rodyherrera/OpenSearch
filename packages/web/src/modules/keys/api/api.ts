import { alova } from '@/app/alova';
import type { ApiKey, CreatedApiKey } from '@/modules/keys/contracts/key';

const BASE = '/apikey';

export const keysApi = {
    list: () => alova.Get<ApiKey[]>(BASE),
    create: (name: string) => alova.Post<CreatedApiKey>(BASE, { name }),
    remove: (id: string) => alova.Delete<void>(`${BASE}/${id}`)
};
