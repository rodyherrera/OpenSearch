import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

interface WorkspaceState{
    workspaces: Workspace[];
    // The workspace whose scope every request carries (via the X-Workspace-Id header).
    activeId: string | null;
    setWorkspaces: (workspaces: Workspace[]) => void;
    setActive: (activeId: string | null) => void;
}

// Only the active selection is persisted; the list itself is re-fetched per load.
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
