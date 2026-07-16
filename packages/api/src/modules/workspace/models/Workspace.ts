import { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '@/shared/models/BaseModel';

export type WorkspaceRole = 'owner' | 'member';

export interface WorkspaceMember{
    userId: Types.ObjectId;
    role: WorkspaceRole;
}

export interface WorkspaceDocument extends Document{
    name: string;
    members: WorkspaceMember[];
    createdAt: Date;
    updatedAt: Date;
}

const configure = (schema: Schema<WorkspaceDocument>): void => {
    schema.index({ 'members.userId': 1 });
    schema.index({ createdAt: 1 });
};

export default defineModel<WorkspaceDocument>('Workspace', {
    name: { type: String, required: true, trim: true },
    members: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'member'], default: 'member' }
    }]
}, configure);
