// // src/index.js
// import app from './app.js';
// import dotenv from 'dotenv';
// import connectDB from "./db/mongoose.js";
// // import { initializeBlockchain } from './utils/blockchain.js';

// // Load environment variables
// dotenv.config();

// const PORT = process.env.PORT || 3000;

// connectDB()
//   .then(() => {
//     app.listen(PORT, () => {
//       console.log(`Server is running on port ${PORT}`);
//     })
//   })
//   .catch((err) => {
//     console.log("MongoDB connection error", err);

//   })


// src/index.js
import app from './app.js';
import dotenv from 'dotenv';
import { initializeBlockchain } from './utils/blockchain.js';
import connectDB from './db/mongoose.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. First connect to MongoDB
    console.log('🔌 Connecting to database...');
    await connectDB();

    // 2. Initialize blockchain connection
    console.log('⛓️ Initializing blockchain...');
    const blockchainInitialized = await initializeBlockchain();

    if (!blockchainInitialized) {
      throw new Error('Failed to initialize blockchain connection');
    }

    // 3. Start server
    app.listen(PORT, () => {
      console.log(`🗄️  Database host: ${process.env.MONGODB_URI?.split('@').pop() || 'localhost'}`);
      console.log(`📡 Blockchain node: ${process.env.PROVIDER_URL}`);
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('‼️ Critical startup failure:', error.message);
    process.exit(1);
  }
};

// Start the application
startServer();