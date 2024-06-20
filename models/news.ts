import mongoose, { Model } from 'mongoose';
import { WebsiteDocument, websiteSchema } from '@models/website';

const newsSchema = websiteSchema;

newsSchema.index({ url: 1, createdAt: 1, updatedAt: 1 });
newsSchema.index({ createdAt: -1, updatedAt: -1 });
newsSchema.index({ url: 'text', title: 'text', description: 'text', keywords: 'text' });

const News: Model<WebsiteDocument> = mongoose.model<WebsiteDocument>('News', newsSchema);

export default News;