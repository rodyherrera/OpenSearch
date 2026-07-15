import { defineModel } from '@/shared/models/BaseModel';
import { hidden } from '@/shared/models/Hidden';
import type { Document, Schema } from 'mongoose';

export interface UserDocument extends Document{
    email: string;
    passwordHash: string;
    role: 'admin';
    createdAt: Date;
    updatedAt: Date;
}

const configure = (schema: Schema<UserDocument>): void => {
    schema.index({ email: 1 }, { unique: true });
    hidden(schema, 'passwordHash');
};

export default defineModel<UserDocument>('User', {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' }
}, configure);
