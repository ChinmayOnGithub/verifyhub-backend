// src/app.js
import express from 'express';
import authRoutes from './routes/auth.routes.js';         // Updated path
import healthRoutes from './routes/health.routes.js';         // Updated path
import certificateRoutes from './routes/certificate.routes.js'; // Updated path
import cors from 'cors';
import morgan from 'morgan';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5173/', 'http://127.0.0.1:5173/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/health', healthRoutes); // Updated this line

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
