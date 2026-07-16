import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import Favicon from '@/shared/components/ui/Favicon';
import QuickActions from '@/modules/overview/components/QuickActions';
import { useWorkspaceOverview } from '@/modules/overview/hooks/useWorkspaceOverview';

const fmt = (value: number): string => value.toLocaleString();

const ago = (iso: string): string => {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if(seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if(minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if(hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};

const Overview = () => {
    const { active, domains, pages, changes, pageCount } = useWorkspaceOverview();

    const stats = [
        { label: 'Pages', value: fmt(pageCount), context: 'indexed in this workspace' },
        { label: 'Domains', value: fmt(domains.length), context: 'discovered from your seeds' },
        { label: 'Recent changes', value: fmt(changes.length), context: 'pages updated on re-crawl' }
    ];

    return (
        <Canvas>
            <Row className='px-8 pt-14 pb-12'>
                <h1 className='text-4xl font-semibold tracking-tight text-foreground'>Overview</h1>
                <p className='mt-3 text-[15px] text-muted'>
                    <span className='text-foreground'>{active?.name ?? 'Your workspace'}</span> at a glance — what your seeds have discovered.
                </p>
            </Row>

            <Row>
                <div className='grid grid-cols-3 gap-px bg-[var(--hairline)]'>
                    {stats.map((stat) => (
                        <div key={stat.label} className='flex flex-col gap-2 bg-background px-8 py-7'>
                            <span className='mono-label text-muted/70'>{stat.label}</span>
                            <span className='text-3xl font-semibold tabular-nums text-foreground'>{stat.value}</span>
                            <span className='text-xs text-muted'>{stat.context}</span>
                        </div>
                    ))}
                </div>
            </Row>

            <Row>
                <QuickActions />
            </Row>

            <Row>
                <header className='flex items-center justify-between px-8 py-4'>
                    <h2 className='text-sm font-medium text-foreground'>Recently indexed</h2>
                    <span className='mono-label text-muted/70'>this workspace</span>
                </header>
                <div className='border-t border-hairline'>
                    {pages.length === 0 ? (
                        <div className='flex flex-col items-center gap-4 px-8 py-14 text-center'>
                            <span className='grid size-12 place-items-center rounded-xl bg-accent/10'>
                                <Sprout className='size-6 text-accent' />
                            </span>
                            <div className='flex flex-col gap-1'>
                                <p className='text-sm font-medium text-foreground'>No pages yet</p>
                                <p className='text-sm text-muted'>Add a seed URL and the crawler will start exploring it into your corpus.</p>
                            </div>
                            <Link
                                to='/seeds'
                                className='rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover'
                            >
                                Add your first seed
                            </Link>
                        </div>
                    ) : (
                        pages.map((page) => (
                            <a
                                key={page.id}
                                href={page.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-3 border-b border-hairline px-8 py-3 transition-colors last:border-b-0 hover:bg-foreground/[0.02]'
                            >
                                <Favicon url={page.url} className='size-8' />
                                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                                    <span className='truncate text-sm text-foreground'>{page.title || page.url}</span>
                                    <span className='truncate text-xs text-muted'>{page.url}</span>
                                </div>
                                <span className='shrink-0 font-mono text-[11px] text-muted/70'>{ago(page.createdAt)}</span>
                            </a>
                        ))
                    )}
                </div>
            </Row>

            {domains.length ? (
                <Row>
                    <header className='flex items-center justify-between px-8 py-4'>
                        <h2 className='text-sm font-medium text-foreground'>Domains</h2>
                        <Link to='/domains' className='mono-label text-muted/70 hover:text-foreground'>View all</Link>
                    </header>
                    <div className='border-t border-hairline'>
                        {domains.slice(0, 8).map((entry) => (
                            <div key={entry.domain} className='flex items-center justify-between gap-4 border-b border-hairline px-8 py-3 last:border-b-0'>
                                <span className='truncate text-sm text-foreground'>{entry.domain}</span>
                                <span className='shrink-0 text-sm tabular-nums text-muted'>{fmt(entry.pages)} pages</span>
                            </div>
                        ))}
                    </div>
                </Row>
            ) : null}

            <Row grow />
        </Canvas>
    );
};

export default Overview;
