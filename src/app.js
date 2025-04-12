// src/app.js
import express from 'express';
import authRoutes from './routes/auth.routes.js';         // Updated path
import healthRoutes from './routes/health.routes.js';         // Updated path
import certificateRoutes from './routes/certificate.routes.js'; // Updated path
import userRoutes from './routes/user.routes.js'; // Added user routes
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './utils/errorUtils.js';

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
app.use('/api/users', userRoutes); // Added user routes

// Add global error handler (must be after routes)
app.use(errorHandler);

// Export app
export default app;
