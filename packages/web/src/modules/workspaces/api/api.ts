import { alova } from '@/app/alova';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

const BASE = '/workspace';

export const workspacesApi = {
    list: () => alova.Get<Workspace[]>(BASE),
    create: (name: string) => alova.Post<Workspace>(BASE, { name }),
    update: (id: string, followExternal: boolean) => alova.Patch<Workspace>(`${BASE}/${id}`, { followExternal })
};
