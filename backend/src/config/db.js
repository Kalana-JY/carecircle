const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.log('No MONGO_URI found — starting in-memory MongoDB for local dev');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      // keep reference so the process doesn't exit and mongod stays alive
      connectDB._mongod = mongod;
    }

    await mongoose.connect(mongoUri, { ignoreUndefined: true });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;