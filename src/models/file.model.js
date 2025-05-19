import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    fileContent: {
        type: String,  
        required: true
    },
    extractedData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    searchableContent: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    tokenHistory: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    error: {
        type: String
    }
}, {
    timestamps: true
});

// Create text index for searchable content
fileSchema.index({ searchableContent: 'text' });

// Create compound index for user and name
fileSchema.index({ user: 1, name: 1 });

const Files = mongoose.model('Files', fileSchema);

export default Files; 