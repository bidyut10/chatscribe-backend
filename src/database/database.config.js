import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../utils/logger.utils.js';

export const connectDB = async () => {
    try {
        await mongoose.connect(config.mongodb.uri);
        logger.info('Connected to MongoDB');
        return true;
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    } catch (error) {
        logger.error('MongoDB disconnection error:', error);
    }
}; 