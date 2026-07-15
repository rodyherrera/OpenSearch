export interface Tuning{
    concurrency: number;
    batchSize: number;
    domainDelayMs: number;
    maxLinksPerPage: number;
    timeoutMs: number;
    respectRobots: boolean;
}

export interface ControlState{
    paused: boolean;
    tuning: Tuning;
}
