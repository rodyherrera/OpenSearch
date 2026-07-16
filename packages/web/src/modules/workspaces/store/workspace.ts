import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

interface WorkspaceState{
    workspaces: Workspace[];
    activeId: string | null;
    setWorkspaces: (workspaces: Workspace[]) => void;
    setActive: (activeId: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            workspaces: [],
            activeId: null,
            setWorkspaces: (workspaces) => set({ workspaces }),
            setActive: (activeId) => set({ activeId })
        }),
        { name: 'crawlm.workspace', partialize: (state) => ({ activeId: state.activeId }) }
    )
);
