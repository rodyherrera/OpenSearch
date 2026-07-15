import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface InfiniteScrollOptions{
    hasMore: boolean;
    loading: boolean;
    onLoadMore: () => void;
    rootMargin?: string;
}

// Fires onLoadMore when the given sentinel element scrolls into view. The observer
// is only active while there is more to load and nothing is in flight, so it never
// double-fires. onLoadMore is read through a ref, so the observer is not recreated
// on every render just because the callback identity changed.
export const useInfiniteScroll = (
    sentinel: RefObject<HTMLElement | null>,
    { hasMore, loading, onLoadMore, rootMargin = '300px' }: InfiniteScrollOptions
): void => {
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;

    useEffect(() => {
        if(!hasMore || loading) return;
        const node = sentinel.current;
        if(!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if(entries[0]?.isIntersecting) onLoadMoreRef.current();
            },
            { rootMargin }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [sentinel, hasMore, loading, rootMargin]);
};
