import { useEffect } from 'react';
import { useRequest } from 'alova/client';
import { invalidateCache } from 'alova';
import { workspacesApi } from '@/modules/workspaces/api/api';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

export interface UseWorkspaces{
    workspaces: Workspace[];
    activeId: string | null;
    active: Workspace | null;
    loading: boolean;
    switchTo: (id: string) => void;
    create: (name: string) => Promise<Workspace>;
}

// Loads the user's workspaces into the shared store, keeps a valid active
// selection, and busts the request cache whenever the active workspace changes so
// scoped listings re-fetch for the new scope.
export const useWorkspaces = (): UseWorkspaces => {
    const { workspaces, activeId, setWorkspaces, setActive } = useWorkspaceStore();
    const { data, loading } = useRequest(workspacesApi.list, { initialData: [] as Workspace[] });

    useEffect(() => {
        if(!data) return;
        setWorkspaces(data);
        // Default to the first workspace when the persisted selection is gone/invalid.
        if(!data.some((workspace) => workspace.id === activeId)){
            setActive(data[0]?.id ?? null);
            void invalidateCache();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const switchTo = (id: string): void => {
        if(id === activeId) return;
        setActive(id);
        void invalidateCache();
    };

    const create = async (name: string): Promise<Workspace> => {
        const workspace = await workspacesApi.create(name);
        setWorkspaces([...workspaces, workspace]);
        setActive(workspace.id);
        void invalidateCache();
        return workspace;
    };

    const active = workspaces.find((workspace) => workspace.id === activeId) ?? null;

    return { workspaces, activeId, active, loading, switchTo, create };
};
