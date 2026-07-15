import { create } from 'zustand';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import type { ChannelStatus } from '@/shared/contracts/channel';
import type { SnapshotFrame, PageFrame, BatchFrame, WorkerLive, RecentItem } from '@/shared/contracts/live';

const RECENT_CAP = 30;
const SERIES_CAP = 60;

export interface CrawlMetrics{
    stored: number;
    websites: number;
    domains: number;
    perMin: number;
    frontier: number;
    seen: number;
}

export interface CrawlLive{
    metrics: CrawlMetrics;
    workers: WorkerLive[];
    recent: RecentItem[];
    series: number[];
    status: ChannelStatus;
}

interface CrawlLiveState{
    metrics: CrawlMetrics;
    workers: WorkerLive[];
    recent: RecentItem[];
    series: number[];
    applySnapshot: (frame: SnapshotFrame) => void;
    applyPage: (frame: PageFrame) => void;
    applyBatch: (frame: BatchFrame) => void;
}

const EMPTY_METRICS: CrawlMetrics = { stored: 0, websites: 0, domains: 0, perMin: 0, frontier: 0, seen: 0 };

// Rolling window, newest-last, capped so the speed chart stays bounded.
const pushSeries = (series: number[], value: number): number[] => {
    const next = [...series, value];
    return next.length > SERIES_CAP ? next.slice(next.length - SERIES_CAP) : next;
};

/**
 * Module-singleton store holding the merged crawl feed. Merge logic mirrors the
 * original vanilla dashboard (applySnapshot / applyPage / applyBatch): the page
 * stream ticks counters up live, batches reconcile to authoritative totals.
 */
const useCrawlStore = create<CrawlLiveState>((set) => ({
    metrics: EMPTY_METRICS,
    workers: [],
    recent: [],
    series: [],

    applySnapshot: (frame) => set((state) => ({
        metrics: {
            stored: frame.stored,
            websites: frame.websites,
            domains: frame.domains,
            perMin: frame.perMin,
            frontier: frame.frontier,
            seen: frame.seen
        },
        workers: frame.workers.map((worker) => ({ ...worker })),
        recent: frame.recent.slice(0, RECENT_CAP),
        series: pushSeries(state.series, frame.perMin)
    })),

    applyPage: (frame) => set((state) => {
        const workers = [...state.workers];
        const index = workers.findIndex((worker) => worker.id === frame.worker);
        if(index >= 0){
            const worker = workers[index];
            workers[index] = { ...worker, stored: worker.stored + 1, lastSeen: frame.at, online: true };
        }else{
            workers.push({ id: frame.worker, stored: 1, lastBatch: 0, lastSeen: frame.at, online: true });
        }
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
            workers,
            recent
        };
    }),

    applyBatch: (frame) => set((state) => {
        const workers = [...state.workers];
        const index = workers.findIndex((worker) => worker.id === frame.worker);
        if(index >= 0){
            const worker = workers[index];
            workers[index] = { ...worker, stored: frame.workerStored, lastBatch: frame.stored, lastSeen: frame.at, online: true };
        }else{
            workers.push({ id: frame.worker, stored: frame.workerStored, lastBatch: frame.stored, lastSeen: frame.at, online: true });
        }
        return {
            metrics: {
                ...state.metrics,
                stored: frame.totalStored,
                perMin: frame.perMin,
                frontier: frame.frontier,
                seen: frame.seen,
                domains: frame.domains,
                websites: Math.max(state.metrics.websites, frame.totalStored)
            },
            workers,
            series: pushSeries(state.series, frame.perMin)
        };
    })
}));

/**
 * Subscribes to the shared `/ws` channel (one pooled socket for the whole app)
 * and returns the live crawl slices plus the connection status. Store actions are
 * stable, so the handlers passed to useChannel keep a constant identity.
 */
export const useCrawlLive = (): CrawlLive => {
    const applySnapshot = useCrawlStore((state) => state.applySnapshot);
    const applyPage = useCrawlStore((state) => state.applyPage);
    const applyBatch = useCrawlStore((state) => state.applyBatch);

    const metrics = useCrawlStore((state) => state.metrics);
    const workers = useCrawlStore((state) => state.workers);
    const recent = useCrawlStore((state) => state.recent);
    const series = useCrawlStore((state) => state.series);

    const { status } = useChannel('/ws', { snapshot: applySnapshot, page: applyPage, batch: applyBatch });

    return { metrics, workers, recent, series, status };
};
