import type { WorkerLive } from '@/shared/contracts/live';

// Freshness window mirrors the vanilla panel: a worker counts as online when it
// was last seen within this window. Recomputed at render so stale rows fade to grey.
const WORKER_ONLINE_MS = 15000;

export const isWorkerOnline = (worker: WorkerLive): boolean =>
    Date.now() - worker.lastSeen <= WORKER_ONLINE_MS;
