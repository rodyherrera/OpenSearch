import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import MetricCard from '@/modules/overview/components/MetricCard';
import RecentFeed from '@/modules/overview/components/RecentFeed';
import type { ChannelStatus } from '@/shared/contracts/channel';

const STATUS_LABEL: Record<ChannelStatus, string> = {
    open: 'Live',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    closed: 'Offline'
};

const Overview = () => {
    const { metrics, history, recent, status } = useCrawlLive();
    const dotClass = status === 'open' ? 'bg-[var(--chart)]' : status === 'closed' ? 'bg-danger' : 'bg-warning';

    return (
        <div className='mx-auto flex max-w-6xl flex-col gap-8'>
            <div className='flex items-center justify-between'>
                <h1 className='text-xl font-semibold tracking-tight text-foreground'>Overview</h1>
                <span className='inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted'>
                    <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden='true' />
                    {STATUS_LABEL[status]}
                </span>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
                <MetricCard
                    label='Pages indexed'
                    value={metrics.stored}
                    context={`${metrics.websites.toLocaleString()} in database`}
                    series={history.stored}
                    live
                />
                <MetricCard
                    label='Domains'
                    value={metrics.domains}
                    context='unique sites discovered'
                    series={history.domains}
                    live
                />
                <MetricCard
                    label='Speed'
                    value={`${metrics.perMin.toLocaleString()}/min`}
                    context='pages per minute'
                    series={history.perMin}
                    live
                />
                <MetricCard
                    label='Frontier'
                    value={metrics.frontier}
                    context='URLs queued'
                    series={history.frontier}
                    live
                />
                <MetricCard
                    label='Discovered'
                    value={metrics.seen}
                    context='unique URLs seen'
                    series={history.seen}
                    live
                />
                <MetricCard
                    label='New domains'
                    value={`${metrics.domainsPerMin.toLocaleString()}/min`}
                    context='fresh domains discovered'
                    series={history.domainsPerMin}
                    live
                />
            </div>

            <section className='flex flex-col gap-4'>
                <h2 className='text-sm font-medium text-muted'>Recently indexed</h2>
                <RecentFeed items={recent} />
            </section>
        </div>
    );
};

export default Overview;
