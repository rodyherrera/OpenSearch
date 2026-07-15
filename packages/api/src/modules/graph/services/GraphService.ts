import GraphEdge from '@/modules/graph/models/GraphEdge';
import { domainOf } from '@/modules/crawler/services/CrawlFrontier';
import { logger } from '@/core/utils/Logger';
import type { GraphSnapshot } from '@/modules/graph/contracts/domain/graph';

const MAX_DEST_PER_PAGE = 8;
const READ_WINDOW = 6000;
const DEFAULT_NODE_LIMIT = 300;

interface PageLike{
    url: string;
    links: string[];
}

export default class GraphService{
    // Persist the directed domain->domain edges discovered in a crawl batch. Called
    // fire-and-forget from the crawler; the capped collection bounds disk use.
    async recordBatch(records: PageLike[]): Promise<void>{
        const docs: { source: string; target: string }[] = [];
        for(const record of records){
            const source = domainOf(record.url);
            if(!source) continue;
            const seen = new Set<string>([source]);
            for(const link of record.links){
                const target = domainOf(link);
                if(!target || seen.has(target)) continue;
                seen.add(target);
                docs.push({ source, target });
                if(seen.size > MAX_DEST_PER_PAGE) break;
            }
        }
        if(!docs.length) return;
        try{
            await GraphEdge.insertMany(docs, { ordered: false });
        }catch(error){
            logger.debug(`graph edge insert failed: ${error}`);
        }
    }

    // Bounded snapshot for the dashboard: dedup the most recent edges, tally per-domain
    // degree, keep the top-N domains and the edges among them. Mirrors the live LRU view.
    async snapshot(limit = DEFAULT_NODE_LIMIT): Promise<GraphSnapshot>{
        const rows = await GraphEdge.find({}, { source: 1, target: 1, _id: 0 })
            .sort({ $natural: -1 })
            .limit(READ_WINDOW)
            .lean();

        const degree = new Map<string, number>();
        const seenEdges = new Set<string>();
        const edges: { source: string; target: string }[] = [];
        for(const row of rows){
            const key = `${row.source}->${row.target}`;
            if(seenEdges.has(key)) continue;
            seenEdges.add(key);
            edges.push({ source: row.source, target: row.target });
            degree.set(row.source, (degree.get(row.source) ?? 0) + 1);
            degree.set(row.target, (degree.get(row.target) ?? 0) + 1);
        }

        const top = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
        const keep = new Set(top.map(([domain]) => domain));

        return {
            nodes: top.map(([id, deg]) => ({ id, deg })),
            links: edges.filter((edge) => keep.has(edge.source) && keep.has(edge.target))
        };
    }
}
