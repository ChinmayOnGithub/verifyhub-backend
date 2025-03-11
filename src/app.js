// src/app.js
import express from 'express';
import authRoutes from './routes/auth.routes.js';         // Updated path
import certificateRoutes from './routes/certificate.routes.js'; // Updated path

const app = express();

// Parse JSON bodies
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/certificate', certificateRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
