import mongoose from 'mongoose';

const mongoConnector = async () => {
    const databaseName = process.env.NODE_ENV === 'production'
        ? process.env.PRODUCTION_DATABASE
        : process.env.DEVELOPMENT_DATABASE;
    console.log(`Open Search -> Connecting to MongoDB (${databaseName})...`);
    const uri = process.env.MONGO_URI + '/' + databaseName;
    mongoose.set('strictQuery', false);
    mongoose.set('strictPopulate', false);
    try{
        await mongoose.connect(uri, { authSource: 'admin' });
        console.log('Open Search -> Connected to MongoDB!');
    }catch(error){
        console.log('Opem Search -> An unhandled error has been ocurred while trying to connect to MongoDB.');
        console.error(error);
    }
};

export default mongoConnector;