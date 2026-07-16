import Favicon from '@/shared/components/ui/Favicon';
import type { RecentItem } from '@/shared/contracts/live';

interface FeedItemProps{
    item: RecentItem;
}

// "42s ago"-style relative stamp, coarse on purpose — the feed refreshes live.
const ago = (at: number): string => {
    const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
    if(seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if(minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
};

const FeedItem = ({ item }: FeedItemProps) => {
    return (
        <li className='flex items-center gap-3 border-b border-hairline px-5 py-3 transition-colors last:border-b-0 hover:bg-foreground/[0.02]'>
            <Favicon url={item.url} className='size-8' />
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <a
                    href={item.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='truncate text-sm text-foreground hover:text-accent'
                >
                    {item.title || item.url}
                </a>
                <span className='truncate text-xs text-muted'>{item.url}</span>
            </div>
            <span className='shrink-0 font-mono text-[11px] text-muted/70'>{ago(item.at)}</span>
        </li>
    );
};

export default FeedItem;
