import { useCallback, useEffect, useMemo, useRef } from 'react';
import ForceGraph3D from '3d-force-graph';
import { graphModel } from '@/modules/graph/model/graphModel';
import type { RefObject } from 'react';
import type { ForceGraph3DInstance, LinkObject } from '3d-force-graph';
import type { DomainNode, GraphStats } from '@/modules/graph/model/graphModel';

// Renders the persistent graphModel in 3D (three.js + d3-force-3d). The model
// outlives this component, so mounting rehydrates the accumulated graph with the
// positions the sim already computed — no rebuild-from-empty on every visit.

type DomainLink = LinkObject<DomainNode>;
type Instance = ForceGraph3DInstance<DomainNode, DomainLink>;

export type { GraphStats };

export interface ForceGraphApi{
    stats: () => GraphStats;
}

const FLUSH_MS = 700;

const readAccent = (): string => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--chart').trim();
    return value || '#7c86ff';
};

const nodeColor = (accent: string) => (node: DomainNode): string => {
    if(node.deg >= 5) return '#b9c0ff';
    if(node.deg >= 2) return accent;
    return '#5b63b0';
};

export const useForceGraph = (containerRef: RefObject<HTMLDivElement | null>): ForceGraphApi => {
    const graphRef = useRef<Instance | null>(null);
    const stats = useCallback((): GraphStats => graphModel.stats(), []);

    useEffect(() => {
        const element = containerRef.current;
        if(!element) return;
        const accent = readAccent();

        // The default export is typed with fixed NodeObject generics, so cast the
        // fresh instance to our node/link types; the chained accessors then type-check.
        const hydrated = graphModel.arrays();
        const graph = (new ForceGraph3D(element, { controlType: 'orbit' }) as unknown as Instance)
            .backgroundColor('#0a0b0e')
            .showNavInfo(false)
            .nodeRelSize(3)
            .nodeResolution(12)
            .nodeOpacity(0.95)
            .nodeVal((node) => 1 + node.deg * 1.2)
            .nodeColor(nodeColor(accent))
            .nodeLabel((node) => node.id)
            .linkColor(() => '#8891c9')
            .linkOpacity(0.5)
            .linkWidth(0)
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(1.6)
            .linkDirectionalParticleSpeed(0.012)
            .linkDirectionalParticleColor(() => accent)
            .width(element.clientWidth)
            .height(element.clientHeight)
            .graphData(hydrated);
        graphRef.current = graph;

        // Pin already-positioned nodes to their stored spots so re-entering /graph
        // shows the exact settled layout instead of re-blooming from a hot reheat.
        // Release after a beat so the sim stays live and integrates fresh nodes.
        for(const node of hydrated.nodes){
            if(node.x !== undefined){
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
            }
        }
        const releaseId = window.setTimeout(() => {
            for(const node of hydrated.nodes){
                node.fx = undefined;
                node.fy = undefined;
                node.fz = undefined;
            }
        }, 2000);

        // Gentle continuous rotation for a sense of depth.
        const extras = graph as unknown as {
            controls?: () => { autoRotate?: boolean; autoRotateSpeed?: number } | undefined;
            _destructor?: () => void;
        };
        const controls = extras.controls?.();
        if(controls){
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.4;
        }

        const resize = (): void => {
            graph.width(element.clientWidth).height(element.clientHeight);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(element);

        // Reflect changes the shell feed pushes into the model while we're mounted.
        // Reused node objects keep their positions; only fresh ones settle in.
        const flushId = window.setInterval(() => {
            if(graphModel.takeDirty()) graph.graphData(graphModel.arrays());
        }, FLUSH_MS);

        return () => {
            window.clearInterval(flushId);
            window.clearTimeout(releaseId);
            observer.disconnect();
            extras._destructor?.();
            graphRef.current = null;
        };
    }, [containerRef]);

    return useMemo(() => ({ stats }), [stats]);
};
