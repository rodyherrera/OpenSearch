import type { NodeObject } from '3d-force-graph';

export interface DomainNode extends NodeObject{
    id: string;
    deg: number;
    seen: number;
}

export interface DomainLinkData{
    source: string;
    target: string;
}

export interface GraphStats{
    nodes: number;
    edges: number;
}

const MAX_NODES = 600;
const MAX_EDGES = 3000;

const nodes = new Map<string, DomainNode>();
const links = new Map<string, DomainLinkData>();
let dirty = false;

// Link targets may arrive as full URLs; reduce them to a bare host. Bare domains
// make `new URL` throw, so we guard and pass them through unchanged.
const hostOf = (value: string): string => {
    if(!value) return '';
    try{
        return new URL(value).hostname || value;
    }catch{
        return value;
    }
};

// Evict the least-connected node (lowest degree, oldest as tiebreak), not the oldest
// one. This sheds leaf domains and preserves the dense hub structure, so the link
// count stays stable instead of collapsing as the live feed churns at the node cap.
const evictLeast = (): void => {
    let victimKey: string | null = null;
    let victimDeg = Infinity;
    let victimSeen = Infinity;
    for(const [key, node] of nodes){
        if(node.deg < victimDeg || (node.deg === victimDeg && node.seen < victimSeen)){
            victimDeg = node.deg;
            victimSeen = node.seen;
            victimKey = key;
        }
    }
    if(!victimKey) return;
    nodes.delete(victimKey);
    for(const [key, link] of links){
        if(link.source === victimKey || link.target === victimKey) links.delete(key);
    }
};

const ensure = (id: string, now: number, near?: DomainNode): DomainNode => {
    const found = nodes.get(id);
    if(found){
        found.seen = now;
        return found;
    }
    if(nodes.size >= MAX_NODES) evictLeast();
    const node: DomainNode = { id, deg: 0, seen: now };
    // Seed next to the source node so it integrates in place, not from the origin.
    if(near && near.x !== undefined){
        node.x = near.x + (Math.random() - 0.5) * 20;
        node.y = (near.y ?? 0) + (Math.random() - 0.5) * 20;
        node.z = (near.z ?? 0) + (Math.random() - 0.5) * 20;
    }
    nodes.set(id, node);
    return node;
};

/**
 * Module-singleton graph model. It outlives the /graph route component, so the
 * accumulated nodes/edges — and the x/y/z the 3D sim writes back onto these very
 * objects — survive navigation. Re-entering /graph rehydrates from here (settled,
 * with positions) instead of rebuilding from an empty graph. Fed app-wide by the
 * dashboard shell, so it stays complete even when /graph isn't mounted.
 */
export const graphModel = {
    addPage(domain: string, targets: string[]): void{
        if(!domain) return;
        const now = performance.now();
        const src = ensure(domain, now);
        for(const raw of targets){
            const dst = hostOf(raw);
            if(!dst || dst === domain) continue;
            const target = ensure(dst, now, src);
            const key = `${domain}→${dst}`;
            if(links.has(key)) continue;
            if(links.size >= MAX_EDGES){
                const stale = links.keys().next().value;
                if(stale) links.delete(stale);
            }
            links.set(key, { source: domain, target: dst });
            src.deg++;
            target.deg++;
        }
        dirty = true;
    },

    // Seed from the backend snapshot (GET /api/v1/graph) so the graph survives a full
    // reload. Merges into whatever the live feed has; new nodes get no position and are
    // laid out once by the sim (Obsidian-style: structure persists, layout recomputes).
    merge(snapshot: { nodes: { id: string; deg: number }[]; links: { source: string; target: string }[] }): void{
        const now = performance.now();
        for(const incoming of snapshot.nodes){
            const found = nodes.get(incoming.id);
            if(found){
                found.deg = Math.max(found.deg, incoming.deg);
                found.seen = now;
            }else{
                if(nodes.size >= MAX_NODES) evictLeast();
                nodes.set(incoming.id, { id: incoming.id, deg: incoming.deg, seen: now });
            }
        }
        for(const incoming of snapshot.links){
            const key = `${incoming.source}→${incoming.target}`;
            if(links.has(key)) continue;
            if(!nodes.has(incoming.source) || !nodes.has(incoming.target)) continue;
            if(links.size >= MAX_EDGES){
                const stale = links.keys().next().value;
                if(stale) links.delete(stale);
            }
            links.set(key, { source: incoming.source, target: incoming.target });
        }
        dirty = true;
    },

    // Same node object references every call (positions preserved); fresh link objects.
    arrays(): { nodes: DomainNode[]; links: DomainLinkData[] }{
        return {
            nodes: [...nodes.values()],
            links: [...links.values()].map((link) => ({ source: link.source, target: link.target }))
        };
    },

    stats(): GraphStats{
        return { nodes: nodes.size, edges: links.size };
    },

    // True (and clears the flag) when there are pending changes worth re-flushing.
    takeDirty(): boolean{
        if(!dirty) return false;
        dirty = false;
        return true;
    }
};
