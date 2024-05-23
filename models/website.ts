import mongoose, { Document, Model } from 'mongoose';

interface WebsiteDocument extends Document{
    url: string;
    title?: string;
    description?: string,
    metaData?: Object;
};

const websiteSchema = new mongoose.Schema<WebsiteDocument>({
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
    metaData: {
        type: Object
    }
}, {
    timestamps: true
});

websiteSchema.index({ url: 1 });
websiteSchema.index({ url: 'text', title: 'text', description: 'text' });

const Website: Model<WebsiteDocument> = mongoose.model<WebsiteDocument>('Website', websiteSchema);

export default Website;