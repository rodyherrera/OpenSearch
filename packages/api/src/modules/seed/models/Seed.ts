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
    // Seeds are scoped per workspace, so the same URL can be seeded by different
    // workspaces — uniqueness is on the (workspace, url) pair, not url alone.
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
