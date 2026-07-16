import type { WorkerInfo } from '@/shared/contracts/live';

interface WorkersPanelProps{
    workers: WorkerInfo[];
}

// Trailing hex chunk of the worker id — enough to tell replicas apart.
const shortId = (id: string): string => {
    const tail = id.split(/[-:]/).pop() ?? id;
    return tail.length > 6 ? tail.slice(-6) : tail;
};

// Live crawler fleet as flat band content: a header row, then one row per worker
// with an online dot and its page count. No card wrapper — the Row frames it.
const WorkersPanel = ({ workers }: WorkersPanelProps) => (
    <div className='flex flex-col'>
        <header className='flex items-center justify-between border-b border-hairline px-6 py-4'>
            <h2 className='text-sm font-medium text-foreground'>Workers</h2>
            <span className='mono-label text-muted/70'>
                {workers.filter((worker) => worker.online).length}/{workers.length} online
            </span>
        </header>
        {workers.length === 0 ? (
            <p className='px-6 py-6 text-sm text-muted'>Waiting for workers…</p>
        ) : (
            <ul className='flex flex-col'>
                {workers.map((worker) => (
                    <li key={worker.id} className='flex items-center gap-3 border-b border-hairline px-6 py-3 last:border-b-0'>
                        <span
                            className={`size-1.5 shrink-0 rounded-full ${worker.online ? 'bg-accent' : 'bg-danger'}`}
                            aria-hidden='true'
                        />
                        <span className='min-w-0 flex-1 truncate font-mono text-xs text-foreground'>{shortId(worker.id)}</span>
                        <span className='shrink-0 font-mono text-xs tabular-nums text-muted'>
                            {worker.stored.toLocaleString()} pages
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default WorkersPanel;
