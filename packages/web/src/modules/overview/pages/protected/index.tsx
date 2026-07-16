import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import MetricCard from '@/modules/overview/components/MetricCard';
import RecentFeed from '@/modules/overview/components/RecentFeed';
import QuickActions from '@/modules/overview/components/QuickActions';
import WorkersPanel from '@/modules/overview/components/WorkersPanel';
import TopDomains from '@/modules/overview/components/TopDomains';

const Overview = () => {
    const { metrics, history, recent, workers } = useCrawlLive();

    return (
        <div className='flex flex-col gap-8 pt-10'>
            <header className='flex flex-col gap-2'>
                <h1 className='text-4xl font-semibold tracking-tight text-foreground'>Overview</h1>
                <p className='text-[15px] text-muted'>Live crawl metrics, streaming as pages land.</p>
            </header>

            {/* Grouped stat card: elevated cells over a hairline-coloured background,
                the 1px gap drawing the dividers. Rounded, Apple grouped-list style. */}
            <div className='overflow-hidden rounded-2xl border border-hairline bg-[var(--hairline)] shadow-sm'>
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

            {/* Jump straight into an endpoint, Firecrawl-style tiles. */}
            <QuickActions />

            {/* Live activity: the feed carries the width; the fleet + leaderboard
                stack on the right. */}
            <div className='grid grid-cols-1 items-start gap-6 xl:grid-cols-3'>
                <section className='overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm xl:col-span-2'>
                    <header className='flex items-center justify-between border-b border-hairline px-5 py-4'>
                        <h2 className='text-sm font-medium text-foreground'>Recently indexed</h2>
                        <span className='mono-label text-muted/70'>{recent.length} pages</span>
                    </header>
                    <RecentFeed items={recent} />
                </section>

                <div className='flex flex-col gap-6'>
                    <WorkersPanel workers={workers} />
                    <TopDomains />
                </div>
            </div>
        </div>
    );
};

export default Overview;
