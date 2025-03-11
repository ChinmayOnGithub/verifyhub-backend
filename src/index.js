// src/index.js
import app from './app.js';
import dotenv from 'dotenv';
import connectDB from "./db/mongoose.js";


// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    })
  })
  .catch((err) => {
    console.log("MongoDB connection error", err);

  })