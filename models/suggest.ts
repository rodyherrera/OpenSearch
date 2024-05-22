import mongoose, { Document, Model } from 'mongoose';

interface SuggestDocument extends Document{
    suggest: string;
};

const suggestSchema = new mongoose.Schema<SuggestDocument>({
    suggest: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    }
}, {
    timestamps: true
});

suggestSchema.index({ suggest: 1 });
suggestSchema.index({ suggest: 'text' });

const Suggest: Model<SuggestDocument> = mongoose.model<SuggestDocument>('Suggest', suggestSchema);

export const searchSuggest = async (searchTerm: string): Promise<SuggestDocument[]> => {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTerm, 'i');
    const query = { suggest: { $regex: regex } };
    try{
        const results = await Suggest.find(query).limit(20);
        return results;
    }catch(error){
        console.log('Open Search -> at @models/suggest.ts - searchSuggest:', error);
        return [];
    }
};