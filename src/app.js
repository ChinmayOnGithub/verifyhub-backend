// src/app.js
import express from 'express';
import authRoutes from './routes/auth.routes.js';         // Updated path
import healthRoutes from './routes/health.routes.js';         // Updated path
import certificateRoutes from './routes/certificate.routes.js'; // Updated path
import cors from 'cors';

const app = express();


// Enable CORS for http://localhost:5173
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5173/', 'http://127.0.0.1:5173/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/health', healthRoutes); // Updated this line

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
