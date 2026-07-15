import FeedItem from '@/modules/overview/components/FeedItem';
import type { RecentItem } from '@/shared/contracts/live';

interface RecentFeedProps{
    items: RecentItem[];
}

const FEED_CAP = 15;

// `items` arrives newest-first from the live store, so slicing keeps the most
// recent pages.
const RecentFeed = ({ items }: RecentFeedProps) => {
    const visible = items.slice(0, FEED_CAP);

    if(!visible.length){
        return <p className='text-sm text-muted'>Waiting for pages…</p>;
    }

    return (
        <ul className='flex flex-col'>
            {visible.map((item, index) => (
                <FeedItem key={`${item.at}-${item.url}-${index}`} item={item} />
            ))}
        </ul>
    );
};

export default RecentFeed;
