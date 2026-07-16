import { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '@/shared/models/BaseModel';

export interface PasswordResetTokenDocument extends Document{
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const configure = (schema: Schema<PasswordResetTokenDocument>): void => {
    schema.index({ tokenHash: 1 }, { unique: true });
    schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
};

export default defineModel<PasswordResetTokenDocument>('PasswordResetToken', {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, configure);
