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

    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    const email = String(process.env.ADMIN_EMAIL || '').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || '').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '');
    const phone = String(process.env.ADMIN_PHONE || '+10000000000').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '');
    if (email && password) {
      const existing = await User.findOne({ email });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name: 'Admin', email, phoneNumber: phone, password: hashedPassword });
      }
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;