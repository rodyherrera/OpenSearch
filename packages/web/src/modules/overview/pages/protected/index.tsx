import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import MetricCard from '@/modules/overview/components/MetricCard';
import RecentFeed from '@/modules/overview/components/RecentFeed';
import Crosshairs from '@/shared/components/ui/Crosshairs';
import type { ChannelStatus } from '@/shared/contracts/channel';

const STATUS_LABEL: Record<ChannelStatus, string> = {
    open: 'Live',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    closed: 'Offline'
};

const Overview = () => {
    const { metrics, history, recent, status } = useCrawlLive();
    const live = status === 'open';

    return (
        <div className='flex flex-col gap-8 pt-10'>
            <header className='flex items-end justify-between gap-4'>
                <div className='flex flex-col gap-2'>
                    <h1 className='text-4xl font-semibold tracking-tight text-foreground'>Overview</h1>
                    <p className='text-[15px] text-muted'>Live crawl metrics, streaming as pages land.</p>
                </div>
                <span className='mono-label inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-muted'>
                    <span
                        className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-accent' : 'bg-danger'}`}
                        aria-hidden='true'
                    />
                    {STATUS_LABEL[status]}
                </span>
            </header>

            {/* Firecrawl-style stat band: one bordered container, hairline dividers drawn
                by the 1px gap over the container's divider-coloured background. */}
            <div className='relative border border-hairline bg-[var(--hairline)]'>
                <Crosshairs />
                <div className='grid grid-cols-1 gap-px md:grid-cols-2 xl:grid-cols-4'>
                    <div className='md:col-span-2 xl:col-span-2'>
                        <MetricCard
                            variant='hero'
                            label='Pages indexed'
                            value={metrics.stored}
                            context={`${metrics.websites.toLocaleString()} in database`}
                            series={history.stored}
                            live
                        />
                    </div>
                    <div className='md:col-span-2 xl:col-span-2'>
                        <MetricCard
                            variant='hero'
                            label='Crawl speed'
                            value={`${metrics.perMin.toLocaleString()}/min`}
                            context='pages per minute'
                            series={history.perMin}
                            live
                        />
                    </div>

                    <MetricCard
                        label='Domains'
                        value={metrics.domains}
                        context='unique sites discovered'
                        series={history.domains}
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
                        context='fresh domains per minute'
                        series={history.domainsPerMin}
                        live
                    />
                </div>
            </div>

            <section className='relative border border-hairline'>
                <Crosshairs />
                <header className='flex items-center justify-between border-b border-hairline px-5 py-4'>
                    <h2 className='text-sm font-medium text-foreground'>Recently indexed</h2>
                    <span className='mono-label text-muted/70'>{recent.length} pages</span>
                </header>
                <div className='px-5 py-2'>
                    <RecentFeed items={recent} />
                </div>
            </section>
        </div>
    );
};

export default Overview;
