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

export const searchWebsite = async (searchTerm: string): Promise<WebsiteDocument[]> => {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { $text: { $search: escapedTerm } };
    try{
        const results = await Website.find(query, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .limit(10)
            .select('title description url metaData')
            .lean();
        return results;
    }catch(error){
        console.error('Open Search -> at @models/website.ts - searchWebsite:', error);
        return [];
    }
};

export default Website;