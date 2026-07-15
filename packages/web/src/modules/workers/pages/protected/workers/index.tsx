import WorkerBar from '@/modules/workers/components/WorkerBar';
import { isWorkerOnline } from '@/modules/workers/utils/online';
import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';

const Workers = () => {
    const { workers } = useCrawlLive();

    const total = workers.length;
    const onlineCount = workers.filter(isWorkerOnline).length;
    // Guard divide-by-zero: share bars fall back to 0% while every worker is empty.
    const totalStored = workers.reduce((sum, worker) => sum + worker.stored, 0);
    const sorted = [...workers].sort((a, b) => b.stored - a.stored);

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex items-baseline justify-between gap-3'>
                <h1 className='text-lg font-medium text-foreground'>Workers</h1>
                <span className='text-sm tabular-nums text-muted'>
                    {onlineCount}/{total} online
                </span>
            </div>

            {total === 0 ? (
                <p className='text-sm text-muted'>No workers reporting yet.</p>
            ) : (
                <div className='flex flex-col gap-3'>
                    {sorted.map((worker) => (
                        <WorkerBar key={worker.id} worker={worker} totalStored={totalStored} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Workers;
