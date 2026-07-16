import { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '@/shared/models/BaseModel';

export interface SeedDocument extends Document{
    url: string;
    domain: string;
    workspaceId?: Types.ObjectId;
}

const configure = (schema: Schema<SeedDocument>): void => {
    schema.index({ createdAt: -1 });
    schema.index({ domain: 1 });
    schema.index({ workspaceId: 1, url: 1 }, { unique: true });
};

export default defineModel<SeedDocument>('Seed', {
    url: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        required: true,
        trim: true
    },
    workspaceId: {
        type: Schema.Types.ObjectId,
        ref: 'Workspace',
        index: true
    }
}, configure);
