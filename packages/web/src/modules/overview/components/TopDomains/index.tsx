import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { ArrowUpRight } from 'lucide-react';
import Favicon from '@/shared/components/ui/Favicon';
import { domainsApi } from '@/modules/domains/api/api';

const TOP_COUNT = 6;

// Leaderboard of the biggest domains in the index, Firecrawl-ranked (#N in
// orange mono) with favicons and page counts.
const TopDomains = () => {
    const { data, loading } = useRequest(domainsApi.list);

    const top = useMemo(
        () => [...(data?.domains ?? [])].sort((a, b) => b.pages - a.pages).slice(0, TOP_COUNT),
        [data]
    );

    return (
        <section className='overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm'>
            <header className='flex items-center justify-between border-b border-hairline px-5 py-4'>
                <h2 className='text-sm font-medium text-foreground'>Top domains</h2>
                <Link
                    to='/domains'
                    className='inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent'
                >
                    View all
                    <ArrowUpRight className='size-3.5' />
                </Link>
            </header>
            {loading ? (
                <ul className='flex flex-col'>
                    {Array.from({ length: TOP_COUNT }).map((_, index) => (
                        <li key={index} className='border-b border-hairline px-5 py-3.5 last:border-b-0'>
                            <div className='h-4 w-2/3 animate-pulse rounded bg-foreground/10' />
                        </li>
                    ))}
                </ul>
            ) : top.length === 0 ? (
                <p className='px-5 py-6 text-sm text-muted'>No domains indexed yet.</p>
            ) : (
                <ul className='flex flex-col'>
                    {top.map((entry, index) => (
                        <li key={entry.domain} className='flex items-center gap-3 border-b border-hairline px-5 py-3 last:border-b-0'>
                            <span className='w-6 shrink-0 font-mono text-xs text-accent'>#{index + 1}</span>
                            <Favicon url={entry.domain} className='size-7' />
                            <span className='min-w-0 flex-1 truncate text-sm text-foreground'>{entry.domain}</span>
                            <span className='shrink-0 font-mono text-xs tabular-nums text-muted'>
                                {entry.pages.toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default TopDomains;
