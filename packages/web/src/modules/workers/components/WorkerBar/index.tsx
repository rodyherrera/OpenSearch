import type { WorkerLive } from '@/shared/contracts/live';
import { isWorkerOnline } from '@/modules/workers/utils/online';

interface WorkerBarProps{
    worker: WorkerLive;
    totalStored: number;
}

const WorkerBar = ({ worker, totalStored }: WorkerBarProps) => {
    const online = isWorkerOnline(worker);
    const share = totalStored > 0 ? (worker.stored / totalStored) * 100 : 0;

    return (
        <div className='flex flex-col gap-2 rounded-lg border border-foreground/10 p-4'>
            <div className='flex items-center justify-between gap-3'>
                <span className='inline-flex items-center gap-2 font-mono text-sm text-foreground'>
                    <span
                        className={`size-2 rounded-full ${online ? 'bg-success' : 'bg-muted'}`}
                        aria-hidden='true'
                    />
                    {worker.id.slice(0, 12)}
                </span>
                <span className='text-sm tabular-nums text-muted'>
                    {worker.stored.toLocaleString()} pages
                </span>
            </div>

            <div className='h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary'>
                <span
                    className='block h-full rounded-full bg-primary'
                    style={{ width: `${share}%` }}
                />
            </div>

            <div className='text-xs tabular-nums text-muted'>
                {Math.round(share)}% of crawl · last batch {worker.lastBatch.toLocaleString()}
            </div>
        </div>
    );
};

export default WorkerBar;
