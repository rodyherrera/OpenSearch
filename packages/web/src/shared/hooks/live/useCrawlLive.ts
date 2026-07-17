import { useEffect } from 'react';
import { create } from 'zustand';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import type { ChannelStatus } from '@/shared/contracts/channel';
import type { SnapshotFrame, PageFrame, BatchFrame, RecentItem, WorkerInfo } from '@/shared/contracts/live';

const RECENT_CAP = 30;
const SERIES_CAP = 60;

export interface CrawlMetrics{
    stored: number;
    websites: number;
    domains: number;
    perMin: number;
    domainsPerMin: number;
    frontier: number;
    seen: number;
}

export interface CrawlHistory{
    stored: number[];
    domains: number[];
    frontier: number[];
    seen: number[];
    perMin: number[];
    domainsPerMin: number[];
}

export interface CrawlLive{
    metrics: CrawlMetrics;
    history: CrawlHistory;
    recent: RecentItem[];
    workers: WorkerInfo[];
    series: number[];
    status: ChannelStatus;
}

interface CrawlLiveState{
    metrics: CrawlMetrics;
    history: CrawlHistory;
    recent: RecentItem[];
    workers: WorkerInfo[];
    applySnapshot: (frame: SnapshotFrame) => void;
    applyPage: (frame: PageFrame) => void;
    applyBatch: (frame: BatchFrame) => void;
}

const EMPTY_METRICS: CrawlMetrics = { stored: 0, websites: 0, domains: 0, perMin: 0, domainsPerMin: 0, frontier: 0, seen: 0 };
const EMPTY_HISTORY: CrawlHistory = { stored: [], domains: [], frontier: [], seen: [], perMin: [], domainsPerMin: [] };

const cap = (series: number[], value: number): number[] => {
    const next = [...series, value];
    return next.length > SERIES_CAP ? next.slice(next.length - SERIES_CAP) : next;
};

const pushHistory = (history: CrawlHistory, metrics: CrawlMetrics): CrawlHistory => ({
    stored: cap(history.stored, metrics.stored),
    domains: cap(history.domains, metrics.domains),
    frontier: cap(history.frontier, metrics.frontier),
    seen: cap(history.seen, metrics.seen),
    perMin: cap(history.perMin, metrics.perMin),
    domainsPerMin: cap(history.domainsPerMin, metrics.domainsPerMin)
});

const useCrawlStore = create<CrawlLiveState>((set) => ({
    metrics: EMPTY_METRICS,
    history: EMPTY_HISTORY,
    recent: [],
    workers: [],

    applySnapshot: (frame) => set((state) => {
        const metrics: CrawlMetrics = {
            stored: frame.stored,
            websites: frame.websites,
            domains: frame.domains,
            perMin: frame.perMin,
            domainsPerMin: frame.domainsPerMin,
            frontier: frame.frontier,
            seen: frame.seen
        };
        return {
            metrics,
            history: pushHistory(state.history, metrics),
            recent: frame.recent.slice(0, RECENT_CAP),
            workers: frame.workers
        };
    }),

    applyPage: (frame) => set((state) => {
        const recent = [
            { url: frame.url, title: frame.title, worker: frame.worker, at: frame.at },
            ...state.recent
        ].slice(0, RECENT_CAP);
        return {
            metrics: {
                ...state.metrics,
                stored: state.metrics.stored + 1,
                websites: state.metrics.websites + 1
            },
            recent
        };
    }),

    applyBatch: (frame) => set((state) => {
        const metrics: CrawlMetrics = {
            ...state.metrics,
            stored: frame.totalStored,
            perMin: frame.perMin,
            domainsPerMin: frame.domainsPerMin,
            frontier: frame.frontier,
            seen: frame.seen,
            domains: frame.domains,
            websites: Math.max(state.metrics.websites, frame.totalStored)
        };
        const workers = state.workers.map((worker) =>
            worker.id === frame.worker
                ? { ...worker, stored: frame.workerStored, lastBatch: frame.stored, lastSeen: frame.at, online: true }
                : worker
        );
        return {
            metrics,
            history: pushHistory(state.history, metrics),
            workers
        };
    })
}));

export const useCrawlLive = (): CrawlLive => {
    const applySnapshot = useCrawlStore((state) => state.applySnapshot);
    const applyPage = useCrawlStore((state) => state.applyPage);
    const applyBatch = useCrawlStore((state) => state.applyBatch);

    const metrics = useCrawlStore((state) => state.metrics);
    const history = useCrawlStore((state) => state.history);
    const recent = useCrawlStore((state) => state.recent);
    const workers = useCrawlStore((state) => state.workers);

    const { send, status } = useChannel('/ws', { snapshot: applySnapshot, page: applyPage, batch: applyBatch });

    useEffect(() => {
        if(status === 'open') send('subscribe', { scope: 'ops' });
    }, [status, send]);

    return { metrics, history, recent, workers, series: history.perMin, status };
};
