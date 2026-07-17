import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type {
    WsSnapshotFrame,
    WsPageFrame,
    WsSeedFrame,
    WsRemovedFrame,
    ChangeFrame,
    WsPageRow,
    Counts,
    LiveDomain,
    LiveSeed,
    LiveChange
} from '@/shared/contracts/live';

const CAP = 50;

const EMPTY_COUNTS: Counts = { pages: 0, domains: 0, changes: 0 };

interface WorkspaceLiveState{
    workspaceId: string | null;
    hydrated: boolean;
    counts: Counts;
    recentPages: WsPageRow[];
    domains: LiveDomain[];
    seeds: LiveSeed[];
    changes: LiveChange[];
    reset: (workspaceId: string | null) => void;
    applySnapshot: (frame: WsSnapshotFrame) => void;
    applyIndexed: (frame: WsPageFrame) => void;
    applyChange: (frame: ChangeFrame) => void;
    applySeed: (frame: WsSeedFrame) => void;
    applyRemoved: (frame: WsRemovedFrame) => void;
}

const useStore = create<WorkspaceLiveState>((set) => ({
    workspaceId: null,
    hydrated: false,
    counts: EMPTY_COUNTS,
    recentPages: [],
    domains: [],
    seeds: [],
    changes: [],

    reset: (workspaceId) => set({ workspaceId, hydrated: false, counts: EMPTY_COUNTS, recentPages: [], domains: [], seeds: [], changes: [] }),

    applySnapshot: (frame) => set({
        workspaceId: frame.workspaceId,
        hydrated: true,
        counts: frame.counts,
        recentPages: frame.recentPages
            .map((page) => ({ url: page.url, title: page.title ?? '', domain: page.domain ?? '', at: new Date(page.createdAt).getTime() }))
            .slice(0, CAP),
        domains: frame.domains,
        seeds: frame.seeds,
        changes: frame.changes.slice(0, CAP)
    }),

    applyIndexed: (frame) => set((state) => {
        if(frame.workspaceId !== state.workspaceId) return {};
        const seen = new Set(state.recentPages.map((page) => page.url));
        const fresh = frame.pages.filter((page) => !seen.has(page.url));
        const recentPages = [...fresh, ...state.recentPages].slice(0, CAP);

        const byDomain = new Map(state.domains.map((entry) => [entry.domain, entry.pages]));
        for(const page of frame.pages){
            if(page.domain) byDomain.set(page.domain, (byDomain.get(page.domain) ?? 0) + 1);
        }
        const domains = [...byDomain.entries()].map(([domain, pages]) => ({ domain, pages })).sort((a, b) => b.pages - a.pages);

        return { recentPages, domains, counts: { ...state.counts, pages: state.counts.pages + frame.pages.length, domains: domains.length } };
    }),

    applyChange: (frame) => set((state) => {
        if(frame.workspaceId !== state.workspaceId) return {};
        const additions = frame.urls.map((url) => ({ url, at: frame.at }));
        const changes = [...additions, ...state.changes].slice(0, CAP);
        return { changes, counts: { ...state.counts, changes: changes.length } };
    }),

    applySeed: (frame) => set((state) => {
        if(frame.workspaceId !== state.workspaceId) return {};
        const ids = new Set(state.seeds.map((seed) => seed.id));
        const fresh = frame.seeds.filter((seed) => !ids.has(seed.id));
        return { seeds: [...fresh, ...state.seeds] };
    }),

    applyRemoved: (frame) => set((state) => {
        if(frame.workspaceId !== state.workspaceId) return {};
        if(frame.kind === 'seed') return { seeds: state.seeds.filter((seed) => seed.id !== frame.id) };
        if(frame.kind === 'domain') return { domains: state.domains.filter((entry) => entry.domain !== frame.domain) };
        const recentPages = state.recentPages.filter((page) => page.url !== frame.url);
        return { recentPages, counts: { ...state.counts, pages: Math.max(0, state.counts.pages - 1) } };
    })
}));

export interface WorkspaceLive{
    counts: Counts;
    recentPages: WsPageRow[];
    domains: LiveDomain[];
    seeds: LiveSeed[];
    changes: LiveChange[];
    hydrated: boolean;
}

export const useWorkspaceLiveSync = (): void => {
    const activeId = useWorkspaceStore((state) => state.activeId);
    const reset = useStore((state) => state.reset);
    const applySnapshot = useStore((state) => state.applySnapshot);
    const applyIndexed = useStore((state) => state.applyIndexed);
    const applyChange = useStore((state) => state.applyChange);
    const applySeed = useStore((state) => state.applySeed);
    const applyRemoved = useStore((state) => state.applyRemoved);

    const { send, status } = useChannel('/ws', {
        'ws:snapshot': applySnapshot,
        'ws:page': applyIndexed,
        change: applyChange,
        'ws:seed': applySeed,
        'ws:removed': applyRemoved
    });

    const prevId = useRef<string | null>(null);
    useEffect(() => {
        if(activeId !== prevId.current){
            reset(activeId);
            prevId.current = activeId;
        }
    }, [activeId, reset]);

    useEffect(() => {
        if(status === 'open' && activeId) send('subscribe', { scope: 'workspace', workspaceId: activeId });
    }, [status, activeId, send]);
};

export const useWorkspaceLive = (): WorkspaceLive => ({
    counts: useStore((state) => state.counts),
    recentPages: useStore((state) => state.recentPages),
    domains: useStore((state) => state.domains),
    seeds: useStore((state) => state.seeds),
    changes: useStore((state) => state.changes),
    hydrated: useStore((state) => state.hydrated)
});
