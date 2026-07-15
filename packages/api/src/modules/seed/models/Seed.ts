import { type Document, type Schema } from 'mongoose';
import { defineModel } from '@/shared/models/BaseModel';

export interface SeedDocument extends Document{
    url: string;
    domain: string;
}

const configure = (schema: Schema<SeedDocument>): void => {
    schema.index({ createdAt: -1 });
    schema.index({ domain: 1 });
};

export default defineModel<SeedDocument>('Seed', {
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    domain: {
        type: String,
        required: true,
        trim: true
    }
}, configure);
