import { Switch } from '@heroui/react';
import { Globe, FileText, Activity } from 'lucide-react';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { useWorkspaceCrawler } from '@/modules/crawler/hooks/useWorkspaceCrawler';
import type { ComponentType, ReactNode } from 'react';

const formatWhen = (ts: number): string =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface StatProps{
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: number;
}

const Stat = ({ icon: Icon, label, value }: StatProps) => (
    <div className='flex flex-col gap-2 rounded-xl border border-hairline bg-surface px-5 py-4'>
        <span className='flex items-center gap-2 text-muted'>
            <Icon className='size-4' />
            <span className='mono-label'>{label}</span>
        </span>
        <span className='text-2xl font-semibold tabular-nums text-foreground'>{value.toLocaleString()}</span>
    </div>
);

const Block = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
    <section className='flex flex-col gap-4'>
        <div className='flex flex-col gap-1'>
            <h2 className='text-base font-semibold text-foreground'>{title}</h2>
            {subtitle ? <p className='text-sm text-muted'>{subtitle}</p> : null}
        </div>
        {children}
    </section>
);

const Crawler = () => {
    const { active, setFollowExternal, domains, changes } = useWorkspaceCrawler();
    const pages = domains.reduce((sum, entry) => sum + entry.pages, 0);

    return (
        <Canvas>
            <Row className='px-8 pt-16 pb-14'>
                <h1 className='text-4xl font-semibold tracking-tight text-foreground'>Crawler</h1>
                <p className='mt-3 text-[15px] text-muted'>
                    How <span className='text-foreground'>{active?.name ?? 'this workspace'}</span> explores the web. Add
                    seeds and it auto-crawls them into your corpus.
                </p>
            </Row>

            <Row className='px-6 py-8'>
                <Block title='Following' subtitle='Control how far this workspace reaches out from its seeds.'>
                    <div className='flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-5 py-4'>
                        <div className='flex flex-col'>
                            <span className='text-sm font-medium text-foreground'>Follow external links</span>
                            <span className='text-xs text-muted'>Also crawl one hop beyond your seeded domains.</span>
                        </div>
                        <Switch
                            isSelected={active?.followExternal ?? false}
                            onChange={(value) => void setFollowExternal(value)}
                            aria-label='Follow external links'
                        >
                            <Switch.Content>
                                <Switch.Control>
                                    <Switch.Thumb />
                                </Switch.Control>
                            </Switch.Content>
                        </Switch>
                    </div>
                </Block>
            </Row>

            <Row className='px-6 py-8'>
                <Block title='This workspace’s corpus' subtitle='What your seeds have discovered so far.'>
                    <div className='grid gap-4 sm:grid-cols-3'>
                        <Stat icon={Globe} label='Domains' value={domains.length} />
                        <Stat icon={FileText} label='Pages' value={pages} />
                        <Stat icon={Activity} label='Recent changes' value={changes.length} />
                    </div>

                    {domains.length ? (
                        <div className='rounded-xl border border-hairline bg-surface'>
                            {domains.slice(0, 10).map((entry) => (
                                <div key={entry.domain} className='flex items-center justify-between gap-4 border-b border-hairline px-5 py-3 last:border-b-0'>
                                    <span className='truncate text-sm text-foreground'>{entry.domain}</span>
                                    <span className='shrink-0 text-sm tabular-nums text-muted'>{entry.pages.toLocaleString()} pages</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='rounded-xl border border-hairline bg-surface px-5 py-6 text-center text-sm text-muted'>
                            No pages yet. Add seeds and the crawler will start exploring them.
                        </p>
                    )}
                </Block>
            </Row>

            {changes.length ? (
                <Row className='px-6 py-8'>
                    <Block title='Recent changes' subtitle='Pages whose content changed on re-crawl.'>
                        <div className='rounded-xl border border-hairline bg-surface'>
                            {changes.slice(0, 10).map((change) => (
                                <div key={`${change.url}-${change.at}`} className='flex items-center justify-between gap-4 border-b border-hairline px-5 py-3 last:border-b-0'>
                                    <span className='truncate text-sm text-foreground'>{change.url}</span>
                                    <span className='shrink-0 whitespace-nowrap text-xs text-muted'>{formatWhen(change.at)}</span>
                                </div>
                            ))}
                        </div>
                    </Block>
                </Row>
            ) : null}

            <Row grow />
        </Canvas>
    );
};

export default Crawler;
