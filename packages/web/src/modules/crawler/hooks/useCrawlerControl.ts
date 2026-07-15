import { useRequest } from 'alova/client';
import { crawlerApi } from '@/modules/crawler/api/api';
import type { Tuning, CrawlerStatus, ControlState } from '@/modules/crawler/contracts/crawler';

export interface CrawlerControlApi{
    status: CrawlerStatus | undefined;
    loading: boolean;
    error: Error | undefined;
    refresh: () => void;
    pause: () => Promise<{ paused: true }>;
    resume: () => Promise<{ paused: false }>;
    toggling: boolean;
    saveTuning: (patch: Partial<Tuning> & { paused?: boolean }) => Promise<ControlState>;
    saving: boolean;
}

export const useCrawlerControl = (): CrawlerControlApi => {
    // force: true so a refresh always bypasses the shared 30s GET cache.
    const status = useRequest(crawlerApi.status, { force: true });
    const refresh = () => { status.send(); };

    const pauseReq = useRequest(crawlerApi.pause, { immediate: false });
    const resumeReq = useRequest(crawlerApi.resume, { immediate: false });
    const patchReq = useRequest(crawlerApi.patchControl, { immediate: false });

    pauseReq.onSuccess(refresh);
    resumeReq.onSuccess(refresh);
    patchReq.onSuccess(refresh);

    // Optimistic: flip the cached paused flag immediately, then reconcile via refresh.
    const pause = () => {
        if(status.data) status.update({ data: { ...status.data, paused: true } });
        return pauseReq.send();
    };

    const resume = () => {
        if(status.data) status.update({ data: { ...status.data, paused: false } });
        return resumeReq.send();
    };

    const saveTuning = (patch: Partial<Tuning> & { paused?: boolean }) => patchReq.send(patch);

    return {
        status: status.data,
        loading: status.loading,
        error: status.error,
        refresh,
        pause,
        resume,
        toggling: pauseReq.loading || resumeReq.loading,
        saveTuning,
        saving: patchReq.loading
    };
};
