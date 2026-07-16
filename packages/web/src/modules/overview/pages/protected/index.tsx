import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import Favicon from '@/shared/components/ui/Favicon';
import QuickActions from '@/modules/overview/components/QuickActions';
import WorkersPanel from '@/modules/overview/components/WorkersPanel';
import TopDomains from '@/modules/overview/components/TopDomains';

const fmt = (value: number): string => value.toLocaleString();

// Coarse relative stamp for the live feed ("42s ago").
const ago = (at: number): string => {
    const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
    if(seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if(minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
};

const FEED_CAP = 10;

const Overview = () => {
    const { metrics, recent, workers } = useCrawlLive();

    const stats = [
        { label: 'Pages indexed', value: fmt(metrics.stored), context: `${fmt(metrics.websites)} in database` },
        { label: 'Crawl speed', value: `${fmt(metrics.perMin)}/min`, context: 'pages per minute' },
        { label: 'Domains', value: fmt(metrics.domains), context: 'unique sites discovered' },
        { label: 'Frontier', value: fmt(metrics.frontier), context: 'URLs queued' },
        { label: 'Discovered', value: fmt(metrics.seen), context: 'unique URLs seen' },
        { label: 'New domains', value: `${fmt(metrics.domainsPerMin)}/min`, context: 'fresh domains per minute' }
    ];

    const feed = recent.slice(0, FEED_CAP);

    return (
        <Canvas>
            {/* Title */}
            <Row className='px-8 pt-14 pb-12'>
                <h1 className='text-4xl font-semibold tracking-tight text-foreground'>Overview</h1>
                <p className='mt-3 text-[15px] text-muted'>Live crawl metrics, streaming as pages land.</p>
            </Row>

            {/* Metrics — flat numeric grid, hairline dividers, no charts */}
            <Row>
                <div className='grid grid-cols-2 gap-px bg-[var(--hairline)] md:grid-cols-3'>
                    {stats.map((stat) => (
                        <div key={stat.label} className='flex flex-col gap-2 bg-background px-8 py-7'>
                            <span className='mono-label text-muted/70'>{stat.label}</span>
                            <span className='text-3xl font-semibold tabular-nums text-foreground'>{stat.value}</span>
                            <span className='text-xs text-muted'>{stat.context}</span>
                        </div>
                    ))}
                </div>
            </Row>

            {/* Jump into an endpoint */}
            <Row>
                <QuickActions />
            </Row>

            {/* Recently indexed */}
            <Row>
                <header className='flex items-center justify-between px-8 py-4'>
                    <h2 className='text-sm font-medium text-foreground'>Recently indexed</h2>
                    <span className='mono-label text-muted/70'>{recent.length} pages</span>
                </header>
                <div className='border-t border-hairline'>
                    {feed.length === 0 ? (
                        <p className='px-8 py-6 text-sm text-muted'>Waiting for pages…</p>
                    ) : (
                        feed.map((item, index) => (
                            <a
                                key={`${item.at}-${item.url}-${index}`}
                                href={item.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-3 border-b border-hairline px-8 py-3 transition-colors last:border-b-0 hover:bg-foreground/[0.02]'
                            >
                                <Favicon url={item.url} className='size-8' />
                                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                                    <span className='truncate text-sm text-foreground'>{item.title || item.url}</span>
                                    <span className='truncate text-xs text-muted'>{item.url}</span>
                                </div>
                                <span className='shrink-0 font-mono text-[11px] text-muted/70'>{ago(item.at)}</span>
                            </a>
                        ))
                    )}
                </div>
            </Row>

            {/* Fleet + leaderboard, split by a hairline */}
            <Row>
                <div className='grid md:grid-cols-2'>
                    <div className='border-b border-hairline md:border-r md:border-b-0'>
                        <WorkersPanel workers={workers} />
                    </div>
                    <div>
                        <TopDomains />
                    </div>
                </div>
            </Row>

            <Row grow />
        </Canvas>
    );
};

export default Overview;
