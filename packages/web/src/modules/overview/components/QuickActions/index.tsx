import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import DotGlyph from '@/shared/components/ui/DotGlyph';
import Crosshairs from '@/shared/components/ui/Crosshairs';

interface Action{
    key: string;
    label: string;
    description: string;
}

const ACTIONS: Action[] = [
    { key: 'search', label: 'Search', description: 'Query everything the crawler has stored.' },
    { key: 'scrape', label: 'Scrape', description: 'One URL, returned as clean markdown.' },
    { key: 'map', label: 'Map', description: 'Enumerate every URL on a site.' },
    { key: 'crawl', label: 'Crawl', description: 'Walk a whole site into the index.' }
];

// Firecrawl-style endpoint tiles: pixel-dot glyph, label, one-liner, and an
// arrow that lights up on hover. Hairline dividers between cells.
const QuickActions = () => (
    <div className='relative border border-hairline bg-[var(--hairline)]'>
        <Crosshairs />
        <div className='grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-4'>
            {ACTIONS.map((action) => (
                <Link
                    key={action.key}
                    to={`/playground?endpoint=${action.key}`}
                    className='group flex flex-col gap-3 bg-background p-5 transition-colors hover:bg-foreground/[0.02]'
                >
                    <div className='flex items-start justify-between'>
                        <DotGlyph pattern={action.key} className='size-4 text-muted/70 transition-colors group-hover:text-accent' />
                        <ArrowUpRight className='size-4 text-muted/40 transition-colors group-hover:text-accent' />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <span className='text-sm font-medium text-foreground'>{action.label}</span>
                        <span className='text-xs text-muted'>{action.description}</span>
                    </div>
                </Link>
            ))}
        </div>
    </div>
);

export default QuickActions;
