import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface InfiniteScrollOptions{
    hasMore: boolean;
    loading: boolean;
    onLoadMore: () => void;
    rootMargin?: string;
}

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
