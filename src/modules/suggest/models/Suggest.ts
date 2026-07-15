import { defineModel } from '@/shared/models/BaseModel';
import type { Document, Schema } from 'mongoose';
import type { SuggestFields } from '@/modules/suggest/contracts/domain/suggest';

interface SuggestDocument extends SuggestFields, Document{}

const configure = (schema: Schema<SuggestDocument>): void => {
    schema.index({ suggest: 'text' });
    schema.index({ suggest: 1 });
};

export default defineModel<SuggestDocument>('Suggest', {
    suggest: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    }
}, configure);
