import mongoose from 'mongoose';

const mongoConnector = async () => {
    const {
        NODE_ENV,
        PRODUCTION_DATABASE,
        DEVELOPMENT_DATABASE,
        MONGO_URI
    } = process.env;

    const databaseName = NODE_ENV === 'production' ? PRODUCTION_DATABASE : DEVELOPMENT_DATABASE;
    const uri = `${MONGO_URI}/${databaseName}`;

    console.log(`Open Search -> Connecting to MongoDB (${databaseName})...`);

    mongoose.set('strictQuery', false);
    mongoose.set('strictPopulate', false);
    
    const options = {
        maxPoolSize: 100, 
        autoIndex: NODE_ENV !== 'production', 
        connectTimeoutMS: 100000,
        socketTimeoutMS: 60000, 
        authSource: 'admin',
        appName: 'opensearch',
        serverSelectionTimeoutMS: 5000,
        maxIdleTimeMS: 30000,
        retryWrites: true
    };

    try{
        await mongoose.connect(uri, options);
        console.log(`Open Search -> Connected to MongoDB (${databaseName})!`);
    }catch(error){
        console.error('Open Search -> Error connecting to MongoDB:', error);
    }
};

export default mongoConnector;
