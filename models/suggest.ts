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

suggestSchema.index({ suggest: 1, createdAt: 1, updatedAt: 1 });
suggestSchema.index({ updatedAt: -1, createdAt: -1 });
suggestSchema.index({ suggest: 'text', createdAt: 'text' });

const Suggest: Model<SuggestDocument> = mongoose.model<SuggestDocument>('Suggest', suggestSchema);

export default Suggest;