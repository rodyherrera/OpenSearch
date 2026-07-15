import { type Document, type Schema } from 'mongoose';
import { defineModel } from '@/shared/models/BaseModel';

export interface WebsiteDocument extends Document{
    url: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    metaData?: Record<string, unknown>;
}

const configure = (schema: Schema<WebsiteDocument>): void => {
    schema.index({ createdAt: -1, updatedAt: -1 });
    schema.index(
        { title: 'text', description: 'text', keywords: 'text', content: 'text', url: 'text' },
        { weights: { title: 10, description: 6, keywords: 6, content: 2, url: 1 }, name: 'website_text' }
    );
};

export default defineModel<WebsiteDocument>('Website', {
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    keywords: {
        type: String,
        trim: true
    },
    content: {
        type: String,
        trim: true
    },
    metaData: {
        type: Object
    }
}, configure);
