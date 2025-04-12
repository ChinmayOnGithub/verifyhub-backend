// src/routes/user.routes.js
import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { getUserProfile, updateUserProfile, getUserStats, getUserCertificates } from '../controllers/user.controller.js';

const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware);

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// User statistics route
router.get('/stats', getUserStats);

// User certificates route
router.get('/certificates', getUserCertificates);

export default router; 