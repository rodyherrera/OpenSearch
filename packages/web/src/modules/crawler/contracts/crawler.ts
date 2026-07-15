import { object, number, boolean, pipe, integer, minValue, type InferOutput } from 'valibot';

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

export interface CrawlerStatus{
    paused: boolean;
    tuning: Tuning;
    frontier: {
        size: number;
        seen: number;
        domains: number;
        stored: number;
        perMin: number;
    };
}

export const TuningSchema = object({
    concurrency: pipe(number(), integer('Whole number'), minValue(1, 'Min 1')),
    batchSize: pipe(number(), integer('Whole number'), minValue(1, 'Min 1')),
    domainDelayMs: pipe(number(), integer('Whole number'), minValue(0, 'Min 0')),
    maxLinksPerPage: pipe(number(), integer('Whole number'), minValue(1, 'Min 1')),
    timeoutMs: pipe(number(), integer('Whole number'), minValue(1000, 'Min 1000')),
    respectRobots: boolean()
});

export type TuningInput = InferOutput<typeof TuningSchema>;
