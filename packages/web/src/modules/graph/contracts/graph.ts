export interface GraphNodeData{
    id: string;
    deg: number;
}

export interface GraphEdgeData{
    source: string;
    target: string;
}

export interface GraphSnapshot{
    nodes: GraphNodeData[];
    links: GraphEdgeData[];
}
