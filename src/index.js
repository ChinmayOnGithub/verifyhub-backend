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
import { initializeBlockchain, startCertificateConfirmationListener, updatePendingCertificates } from './utils/blockchain.js';
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

    // 3. Start certificate status listeners and update pending certificates
    console.log('📡 Starting certificate status listeners...');
    await startCertificateConfirmationListener();

    // 4. Update any existing pending certificates
    console.log('🔍 Checking for pending certificates...');
    await updatePendingCertificates();

    // 5. Schedule regular checks for pending certificates
    console.log('⏰ Setting up scheduled certificate checks...');

    // Check every minute for first 10 minutes after startup (quick updates for new certificates)
    let minuteCount = 0;
    const quickInterval = setInterval(async () => {
      try {
        if (minuteCount > 10) {
          clearInterval(quickInterval);
          console.log('Quick check interval completed');
          return;
        }
        console.log(`Quick check ${minuteCount + 1}/10 for pending certificates...`);
        await updatePendingCertificates(20); // Check 20 most recent
        minuteCount++;
      } catch (err) {
        console.error('Error in quick certificate check:', err);
      }
    }, 60 * 1000); // Every minute

    // Check every 5 minutes for ongoing verification
    setInterval(async () => {
      try {
        console.log('Running regular certificate verification check...');
        await updatePendingCertificates();
      } catch (err) {
        console.error('Error in regular certificate check:', err);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // 6. Start server
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