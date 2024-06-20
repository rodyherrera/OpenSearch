import mongoose, { Model } from 'mongoose';
import { WebsiteDocument, websiteSchema } from '@models/website';

const shoppingSchema = websiteSchema;

shoppingSchema.index({ url: 1, createdAt: 1, updatedAt: 1 });
shoppingSchema.index({ createdAt: -1, updatedAt: -1 });
shoppingSchema.index({ url: 'text', title: 'text', description: 'text', keywords: 'text' });

const Shopping: Model<WebsiteDocument> = mongoose.model<WebsiteDocument>('Shopping', shoppingSchema);

export default Shopping;