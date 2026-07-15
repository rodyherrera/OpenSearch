import mongoose from 'mongoose';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

export default class MongoDataSource{
    async initialize(): Promise<void>{
        mongoose.set('strictQuery', false);
        mongoose.set('strictPopulate', false);
        await mongoose.connect(config.mongo.uri, {
            dbName: config.mongo.db,
            appName: 'Crawlm',
            authSource: 'admin',
            maxPoolSize: 200,
            connectTimeoutMS: 100000,
            socketTimeoutMS: 60000,
            serverSelectionTimeoutMS: 5000,
            maxIdleTimeMS: 30000,
            retryWrites: true
        });
        logger.info('Connected to MongoDB', { scope: 'mongo', db: config.mongo.db });
    }

    async destroy(): Promise<void>{
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB', { scope: 'mongo' });
    }
}
