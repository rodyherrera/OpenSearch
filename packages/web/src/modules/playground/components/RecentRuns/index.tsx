import { Link } from 'react-router-dom';
import { Chip } from '@heroui/react';
import { ArrowUpRight, CheckCircle2, XCircle, Search, ScrollText } from 'lucide-react';
import { Row } from '@/shared/components/ui/Blueprint';
import Favicon from '@/shared/components/ui/Favicon';
import DotGlyph from '@/shared/components/ui/DotGlyph';
import type { ReactNode } from 'react';
import type { RecentRun } from '@/modules/playground/store/runs';

const ENDPOINT_LABEL: Record<string, string> = {
    search: 'Search',
    scrape: 'Scrape',
    map: 'Map',
    crawl: 'Crawl'
};

interface MetaRowProps{
    label: string;
    children: ReactNode;
}

const MetaRow = ({ label, children }: MetaRowProps) => (
    <div className='grid grid-cols-[88px_1fr] items-center gap-3 border-t border-hairline px-4 py-3'>
        <span className='text-sm text-muted'>{label}</span>
        <span className='flex min-w-0 items-center gap-2 text-sm text-foreground'>{children}</span>
    </div>
);

const RunCard = ({ run }: { run: RecentRun }) => {
    const started = new Date(run.startedAt);
    const failed = run.status === 'failed';

    return (
        <article className='flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm'>
            <header className='flex items-center gap-3 px-4 py-3'>
                {run.endpoint === 'search' ? (
                    <span className='grid size-7 shrink-0 place-items-center'>
                        <Search className='size-4 text-accent' />
                    </span>
                ) : (
                    <Favicon url={run.query} className='size-7' />
                )}
                <span className='min-w-0 flex-1 truncate text-sm font-medium text-foreground'>
                    {run.query.replace(/^https?:\/\//i, '')}
                </span>
                <Link
                    to={`/playground?endpoint=${run.endpoint}&q=${encodeURIComponent(run.query)}`}
                    aria-label='Open in playground'
                    className='shrink-0 text-muted transition-colors hover:text-accent'
                >
                    <ArrowUpRight className='size-4' />
                </Link>
            </header>

            <MetaRow label='Endpoint'>
                <DotGlyph pattern={run.endpoint} className='size-3.5 text-accent' />
                {ENDPOINT_LABEL[run.endpoint] ?? run.endpoint}
            </MetaRow>

            <MetaRow label='Status'>
                {failed ? <XCircle className='size-4 text-danger' /> : <CheckCircle2 className='size-4 text-accent' />}
                <span className={failed ? 'text-danger' : ''}>{failed ? 'Failed' : 'Success'}</span>
            </MetaRow>

            <MetaRow label='Started'>
                <span className='flex flex-col'>
                    {started.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className='text-xs text-muted'>
                        {started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                </span>
            </MetaRow>

            <MetaRow label='Formats'>
                {run.formats.length ? (
                    run.formats.map((format) => (
                        <Chip key={format} size='sm' variant='soft' className='gap-1.5'>
                            <ScrollText className='size-3 text-accent' />
                            {format}
                        </Chip>
                    ))
                ) : (
                    <span className='text-muted'>No formats selected</span>
                )}
            </MetaRow>
        </article>
    );
};

interface RecentRunsProps{
    runs: RecentRun[];
}

const RecentRuns = ({ runs }: RecentRunsProps) => {
    if(!runs.length) return null;

    return (
        <>
            <Row className='px-8 pt-9 pb-5'>
                <h2 className='text-xl font-semibold tracking-tight text-foreground'>Recent Runs</h2>
            </Row>
            <Row className='p-6'>
                <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
                    {runs.map((run) => (
                        <RunCard key={run.id} run={run} />
                    ))}
                </div>
            </Row>
        </>
    );
};

export default RecentRuns;
