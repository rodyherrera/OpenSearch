import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    src: { 
        type: String,
        required: true, 
        unique: true 
    },
    width: { type: String, required: false },
    height: { type: String, required: false },
    alt: { 
        type: String, 
        required: true, 
        trim: true 
    }
}, {
    timestamps: true
});

imageSchema.index({ createdAt: 1, updatedAt: 1, width: 1, height: 1 });
imageSchema.index({ createdAt: -1, updatedAt: -1, width: -1, height: -1 });
imageSchema.index({ alt: 'text' });

const Image = mongoose.model('Image', imageSchema);

export default Image;