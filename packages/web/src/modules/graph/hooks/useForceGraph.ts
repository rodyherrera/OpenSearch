import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

// A tiny self-contained force-directed sim ported from the vanilla dashboard:
// domains are nodes, directed links are spring edges. Nodes repel each other
// (O(n²) is fine at these caps), edges pull together, everything drifts toward
// the centre. Fresh nodes flash. Runs entirely on refs + rAF so it stays clear
// of React's render cycle (react-compiler-safe).

interface GraphNode{
    x: number;
    y: number;
    vx: number;
    vy: number;
    deg: number;
    seen: number;
    fresh: number;
    color: string;
    label: string;
}

interface GraphEdge{
    a: string;
    b: string;
    t: number;
}

interface ViewState{
    x: number;
    y: number;
    k: number;
    dragging: boolean;
    lx: number;
    ly: number;
}

interface CanvasSize{
    w: number;
    h: number;
    dpr: number;
}

export interface GraphStats{
    nodes: number;
    edges: number;
}

export interface ForceGraphApi{
    addPage: (domain: string, links: string[]) => void;
    stats: () => GraphStats;
}

const MAX_NODES = 220;
const MAX_EDGES = 700;

// Stable hue per domain: same string always lands on the same colour.
const hueFor = (seed: string): string => {
    let h = 0;
    for(let i = 0; i < seed.length; i++){
        h = (h * 31 + seed.charCodeAt(i)) % 360;
    }
    return `hsl(${h}, 70%, 60%)`;
};

// The frame already gives a bare `domain`, but link targets may arrive as full
// URLs — reduce them to a host. Bare domains make `new URL` throw, so we guard
// and pass them through unchanged.
const hostOf = (value: string): string => {
    if(!value) return '';
    try{
        return new URL(value).hostname || value;
    }catch{
        return value;
    }
};

const evictOldest = (nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>): void => {
    let oldestKey: string | null = null;
    let oldest = Infinity;
    for(const [key, node] of nodes){
        if(node.seen < oldest){
            oldest = node.seen;
            oldestKey = key;
        }
    }
    if(!oldestKey) return;
    nodes.delete(oldestKey);
    for(const [key, edge] of edges){
        if(edge.a === oldestKey || edge.b === oldestKey) edges.delete(key);
    }
};

const ensureNode = (
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    domain: string,
    size: CanvasSize
): GraphNode => {
    const existing = nodes.get(domain);
    if(existing){
        existing.seen = performance.now();
        return existing;
    }
    if(nodes.size >= MAX_NODES) evictOldest(nodes, edges);
    // Spawn near the centre with a little jitter so it visibly flies out.
    const node: GraphNode = {
        x: size.w / 2 + (Math.random() - 0.5) * 60,
        y: size.h / 2 + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        deg: 0,
        seen: performance.now(),
        fresh: 1,
        color: hueFor(domain),
        label: domain
    };
    nodes.set(domain, node);
    return node;
};

const step = (
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    size: CanvasSize
): void => {
    const arr = [...nodes.values()];
    const n = arr.length;
    // Repulsion between every pair (skipped past a cutoff radius).
    for(let i = 0; i < n; i++){
        const a = arr[i];
        for(let j = i + 1; j < n; j++){
            const b = arr[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy || 0.01;
            if(d2 < 40000){
                const f = 900 / d2;
                const d = Math.sqrt(d2);
                const ux = dx / d;
                const uy = dy / d;
                a.vx += ux * f;
                a.vy += uy * f;
                b.vx -= ux * f;
                b.vy -= uy * f;
            }
        }
    }
    // Springs along edges pull linked domains toward a rest length.
    for(const edge of edges.values()){
        const a = nodes.get(edge.a);
        const b = nodes.get(edge.b);
        if(!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 70) * 0.01;
        const ux = dx / d;
        const uy = dy / d;
        a.vx += ux * f;
        a.vy += uy * f;
        b.vx -= ux * f;
        b.vy -= uy * f;
    }
    // Centre gravity, integrate, damp, decay the fresh flash.
    for(const node of arr){
        node.vx += (size.w / 2 - node.x) * 0.0009;
        node.vy += (size.h / 2 - node.y) * 0.0009;
        node.vx *= 0.86;
        node.vy *= 0.86;
        node.x += node.vx;
        node.y += node.vy;
        if(node.fresh > 0) node.fresh *= 0.92;
    }
};

const draw = (
    ctx: CanvasRenderingContext2D,
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    view: ViewState,
    size: CanvasSize
): void => {
    // Reset to a DPR-scaled identity so physics coordinates stay in CSS pixels.
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.k, view.k);
    const now = performance.now();
    // Edges — newly discovered ones flash bright, then settle faint.
    ctx.lineWidth = 0.6;
    for(const edge of edges.values()){
        const a = nodes.get(edge.a);
        const b = nodes.get(edge.b);
        if(!a || !b) continue;
        const alpha = now - edge.t < 800 ? 0.85 : 0.16;
        ctx.strokeStyle = `rgba(120, 150, 200, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    // Nodes — radius ∝ √degree (capped), with a green halo while fresh.
    for(const node of nodes.values()){
        const r = Math.min(3 + Math.sqrt(node.deg) * 1.7, 16);
        if(node.fresh > 0.1){
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 8 * node.fresh, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 211, 166, ${0.25 * node.fresh})`;
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        // Label only the bigger hubs to avoid clutter.
        if(r >= 7){
            ctx.fillStyle = 'rgba(230, 235, 240, 0.85)';
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(node.label.replace(/^www\./, '').slice(0, 22), node.x + r + 2, node.y + 3);
        }
    }
    ctx.restore();
};

export const useForceGraph = (canvasRef: RefObject<HTMLCanvasElement | null>): ForceGraphApi => {
    const nodesRef = useRef<Map<string, GraphNode>>(new Map());
    const edgesRef = useRef<Map<string, GraphEdge>>(new Map());
    const viewRef = useRef<ViewState>({ x: 0, y: 0, k: 1, dragging: false, lx: 0, ly: 0 });
    const sizeRef = useRef<CanvasSize>({ w: 0, h: 0, dpr: 1 });

    // Register a crawled page: bump/create its source node, then add a directed
    // edge to each linked domain (creating those nodes too). LRU-evicts at cap.
    const addPage = useCallback((domain: string, links: string[]): void => {
        if(!domain) return;
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const size = sizeRef.current;
        const src = ensureNode(nodes, edges, domain, size);
        src.fresh = 1;
        for(const link of links){
            const dst = hostOf(link);
            if(!dst || dst === domain) continue;
            ensureNode(nodes, edges, dst, size);
            const key = `${domain}→${dst}`;
            if(edges.has(key)) continue;
            if(edges.size >= MAX_EDGES){
                const stale = edges.keys().next().value;
                if(stale) edges.delete(stale);
            }
            edges.set(key, { a: domain, b: dst, t: performance.now() });
            const a = nodes.get(domain);
            const b = nodes.get(dst);
            if(a) a.deg++;
            if(b) b.deg++;
        }
    }, []);

    const stats = useCallback((): GraphStats => ({
        nodes: nodesRef.current.size,
        edges: edgesRef.current.size
    }), []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const view = viewRef.current;
        const size = sizeRef.current;

        // Keep the backing store matched to the element's CSS size × DPR.
        const resize = (): void => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            size.w = rect.width;
            size.h = rect.height;
            size.dpr = dpr;
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
        };
        resize();

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        let raf = 0;
        const frame = (): void => {
            step(nodes, edges, size);
            draw(ctx, nodes, edges, view, size);
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        // Pan via pointer drag, zoom via wheel — all in CSS-pixel space.
        const onPointerDown = (e: PointerEvent): void => {
            view.dragging = true;
            view.lx = e.offsetX;
            view.ly = e.offsetY;
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
        };
        const onPointerMove = (e: PointerEvent): void => {
            if(!view.dragging) return;
            view.x += e.offsetX - view.lx;
            view.y += e.offsetY - view.ly;
            view.lx = e.offsetX;
            view.ly = e.offsetY;
        };
        const onPointerUp = (e: PointerEvent): void => {
            view.dragging = false;
            if(canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
            canvas.style.cursor = 'grab';
        };
        const onWheel = (e: WheelEvent): void => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            view.k = Math.max(0.2, Math.min(3, view.k * factor));
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [canvasRef]);

    return useMemo(() => ({ addPage, stats }), [addPage, stats]);
};
