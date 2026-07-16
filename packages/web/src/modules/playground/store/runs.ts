import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Endpoint } from '@/modules/playground/contracts/playground';

export interface RecentRun{
    id: string;
    endpoint: Endpoint;
    // Search query or target URL, as the user typed it.
    query: string;
    status: 'success' | 'failed';
    startedAt: number;
    formats: string[];
}

interface RunsState{
    runs: RecentRun[];
    record: (run: Omit<RecentRun, 'id'>) => void;
}

const CAP = 12;

// Client-side run history for the playground's "Recent Runs" grid. Persisted to
// localStorage — the API has no run-log endpoint, and this is per-operator anyway.
export const useRecentRuns = create<RunsState>()(
    persist(
        (set) => ({
            runs: [],
            record: (run) =>
                set((state) => ({
                    runs: [
                        { ...run, id: `${run.startedAt.toString(36)}-${Math.trunc(Math.random() * 1e6).toString(36)}` },
                        ...state.runs
                    ].slice(0, CAP)
                }))
        }),
        { name: 'crawlm.playground.runs' }
    )
);
