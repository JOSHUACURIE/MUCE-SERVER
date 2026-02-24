// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes
    await createIndexes();
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  // Create any additional indexes if needed
  const promises = [];
  
  // User email unique index
  promises.push(mongoose.model('User').createIndexes());
  
  // Event date indexes for queries
  promises.push(mongoose.model('Event').collection.createIndex({ startDate: 1, endDate: 1 }));
  
  // Opportunity deadline index
  promises.push(mongoose.model('Opportunity').collection.createIndex({ applicationDeadline: 1 }));
  
  await Promise.all(promises);
};

module.exports = connectDB;