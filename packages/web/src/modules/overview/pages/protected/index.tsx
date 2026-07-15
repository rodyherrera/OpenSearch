import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import MetricCard from '@/modules/overview/components/MetricCard';
import Sparkline from '@/modules/overview/components/Sparkline';
import RecentFeed from '@/modules/overview/components/RecentFeed';

const Overview = () => {
    const { metrics, recent, series } = useCrawlLive();

    return (
        <div className='flex flex-col gap-6'>
            <h1 className='text-2xl font-semibold text-foreground'>Overview</h1>

            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'>
                <MetricCard
                    label='Pages indexed'
                    value={metrics.stored}
                    sub={`${metrics.websites.toLocaleString()} in DB`}
                />
                <MetricCard label='Domains' value={metrics.domains} sub='unique sites discovered' />
                <MetricCard label='Speed' value={`${metrics.perMin.toLocaleString()}/min`} sub='pages / min' />
                <MetricCard label='Frontier queued' value={metrics.frontier} sub='URLs waiting' />
                <MetricCard label='Discovered' value={metrics.seen} sub='unique URLs seen' />
            </div>

            <section className='rounded-lg border border-foreground/10 bg-surface-secondary p-4'>
                <h2 className='mb-3 text-sm font-semibold text-foreground'>
                    Crawl speed (last ~60 ticks)
                </h2>
                <Sparkline data={series} />
            </section>

            <section className='rounded-lg border border-foreground/10 bg-surface-secondary p-4'>
                <h2 className='mb-3 text-sm font-semibold text-foreground'>Recently indexed</h2>
                <RecentFeed items={recent} />
            </section>
        </div>
    );
};

export default Overview;
