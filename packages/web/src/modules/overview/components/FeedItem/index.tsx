import type { RecentItem } from '@/shared/contracts/live';

interface FeedItemProps{
    item: RecentItem;
}

const FeedItem = ({ item }: FeedItemProps) => {
    return (
        <li className='flex flex-col gap-0.5 border-b border-foreground/10 py-2 last:border-b-0'>
            <a
                href={item.url}
                target='_blank'
                rel='noopener noreferrer'
                className='truncate text-sm text-foreground hover:text-primary'
            >
                {item.title || item.url}
            </a>
            <span className='truncate text-xs text-muted'>{item.url}</span>
        </li>
    );
};

export default FeedItem;
