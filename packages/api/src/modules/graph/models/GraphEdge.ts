import mongoose from 'mongoose';
import type { Model } from 'mongoose';

export interface GraphEdgeDocument{
    source: string;
    target: string;
}

// Capped collection: append-only directed domain->domain edges with FIFO eviction,
// so the crawl's edge history stays bounded on disk without any pruning job. No
// unique index (capped disallows it); duplicates are collapsed at query time.
const schema = new mongoose.Schema<GraphEdgeDocument>({
    source: { type: String, required: true },
    target: { type: String, required: true }
}, {
    capped: { size: 8 * 1024 * 1024, max: 40000 },
    versionKey: false
});

const GraphEdge: Model<GraphEdgeDocument> = mongoose.model<GraphEdgeDocument>('GraphEdge', schema);

export default GraphEdge;
