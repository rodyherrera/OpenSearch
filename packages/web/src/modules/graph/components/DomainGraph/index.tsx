import { useEffect, useRef, useState } from 'react';
import { useForceGraph } from '@/modules/graph/hooks/useForceGraph';
import { graphModel } from '@/modules/graph/model/graphModel';
import { graphApi } from '@/modules/graph/api/api';
import type { GraphStats } from '@/modules/graph/model/graphModel';

const DomainGraph = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graph = useForceGraph(containerRef);
    // Seed from the persistent model so the overlay never flickers 0 on re-entry.
    const [counts, setCounts] = useState<GraphStats>(() => graphModel.stats());

    // Hydrate from the backend on mount so the graph survives a full reload; the live
    // feed then keeps building on top. best-effort — if it fails the feed still fills in.
    useEffect(() => {
        let cancelled = false;
        void graphApi.snapshot().then(
            (snapshot) => { if(!cancelled) graphModel.merge(snapshot); },
            () => undefined
        );
        return () => { cancelled = true; };
    }, []);

    // The graph is fed app-wide by the shell (useGraphFeed); here we just render the
    // persistent model and poll its counts for the overlay.
    useEffect(() => {
        const id = window.setInterval(() => setCounts(graph.stats()), 500);
        return () => window.clearInterval(id);
    }, [graph]);

    return (
        <div className='relative size-full overflow-hidden'>
            <div ref={containerRef} className='size-full' />
            <div className='pointer-events-none absolute left-4 top-4 rounded-md border border-foreground/10 bg-background/70 px-2.5 py-1 text-xs text-muted backdrop-blur'>
                {counts.nodes} domains · {counts.edges} links
            </div>
            <div className='pointer-events-none absolute bottom-4 right-4 rounded-md bg-background/70 px-2.5 py-1 text-xs text-muted backdrop-blur'>
                drag to orbit · scroll to zoom
            </div>
        </div>
    );
};

export default DomainGraph;
