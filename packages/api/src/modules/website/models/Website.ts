import { type Document, type Schema } from 'mongoose';
import { defineModel } from '@/shared/models/BaseModel';

export interface WebsiteDocument extends Document{
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    markdown?: string;
    metaData?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
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
    // Registrable domain (eTLD+1) of the URL, set at write time. Powers the
    // Domains view via aggregation, so it must stay consistent with the index.
    domain: {
        type: String,
        trim: true,
        index: true
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
    // Full page as clean Markdown (LLM-ready). Populated lazily by the on-demand
    // scrape endpoint; the massive crawler leaves it empty for throughput.
    markdown: {
        type: String
    },
    metaData: {
        type: Object
    }
}, configure);
