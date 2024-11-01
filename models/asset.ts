import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true
    },
    parentUrl: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'pdf',
            'docx',
            'xls',
            'xlsx',
            'ppt',
            'pptx',
            'script', 
            'stylesheet', 
            'font'
        ],
        required: true
    }
}, { timestamps: true });

assetSchema.index({ createdAt: 1, updatedAt: 1 });
assetSchema.index({ createdAt: -1, updatedAt: -1 });
assetSchema.index({ url: 'text', parentUrl: 'text', type: 'text' });

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;