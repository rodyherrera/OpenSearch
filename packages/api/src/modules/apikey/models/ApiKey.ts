import { defineModel } from '@/shared/models/BaseModel';
import { hidden } from '@/shared/models/Hidden';
import type { Document, Schema } from 'mongoose';

export interface ApiKeyDocument extends Document{
    name: string;
    // sha256 of the plaintext key. The plaintext is never stored — only shown once.
    keyHash: string;
    prefix: string;
    last4: string;
    lastUsedAt?: Date;
    requestCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const configure = (schema: Schema<ApiKeyDocument>): void => {
    schema.index({ keyHash: 1 }, { unique: true });
    schema.index({ createdAt: -1 });
    hidden(schema, 'keyHash');
};

export default defineModel<ApiKeyDocument>('ApiKey', {
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    last4: { type: String, required: true },
    lastUsedAt: { type: Date },
    requestCount: { type: Number, default: 0 }
}, configure);
