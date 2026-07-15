import { useEffect, useRef, useState } from 'react';
import { useForceGraph } from '@/modules/graph/hooks/useForceGraph';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import type { GraphStats } from '@/modules/graph/hooks/useForceGraph';

const DomainGraph = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const graph = useForceGraph(canvasRef);
    const [counts, setCounts] = useState<GraphStats>({ nodes: 0, edges: 0 });

    // Share the one pooled `/ws` socket (the shell + overview already hold it);
    // we just add a `page` handler that feeds the live sim.
    useChannel('/ws', {
        page: (frame) => graph.addPage(frame.domain, frame.links)
    });

    // The canvas counts live in refs (outside React) — poll them for the overlay.
    useEffect(() => {
        const id = window.setInterval(() => setCounts(graph.stats()), 500);
        return () => window.clearInterval(id);
    }, [graph]);

    return (
        <div className='relative h-[70vh] w-full rounded-lg border border-foreground/10 bg-surface-secondary'>
            <canvas ref={canvasRef} className='block size-full cursor-grab rounded-lg' />
            <div className='pointer-events-none absolute left-3 top-3 rounded-md bg-background/70 px-2.5 py-1 text-xs text-muted backdrop-blur'>
                {counts.nodes} domains · {counts.edges} links
            </div>
        </div>
    );
};

export default DomainGraph;
