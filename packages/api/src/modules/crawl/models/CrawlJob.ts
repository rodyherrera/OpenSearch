import { defineModel } from '@/shared/models/BaseModel';
import type { Document, Schema } from 'mongoose';

export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface CrawlJobDocument extends Document{
    url: string;
    domain: string;
    status: CrawlJobStatus;
    limit: number;
    respectRobots: boolean;
    webhookUrl?: string;
    // URLs successfully scraped by this job; their content lives in the Website index.
    pages: string[];
    total: number;
    error?: string;
    // Who created the job — an API key id, or 'dashboard' for JWT callers.
    owner: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const configure = (schema: Schema<CrawlJobDocument>): void => {
    schema.index({ createdAt: -1 });
    schema.index({ status: 1 });
};

export default defineModel<CrawlJobDocument>('CrawlJob', {
    url: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
    limit: { type: Number, default: 50 },
    respectRobots: { type: Boolean, default: false },
    webhookUrl: { type: String, trim: true },
    pages: { type: [String], default: [] },
    total: { type: Number, default: 0 },
    error: { type: String },
    owner: { type: String, required: true },
    startedAt: { type: Date },
    completedAt: { type: Date }
}, configure);
