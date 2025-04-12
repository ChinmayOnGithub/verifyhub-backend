// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * JWT authentication middleware.
 */
const authMiddleware = (req, res, next) => {
  console.log('[Auth] Checking authentication...');
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists and has correct format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] No valid auth header found:', authHeader);
    return res.status(401).json({
      success: false,
      status: 'ERROR',
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    console.log('[Auth] Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[Auth] Token valid for user: ${decoded.id}, role: ${decoded.role}`);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      status: 'ERROR',
      message: error.name === 'TokenExpiredError'
        ? 'Authentication token has expired'
        : 'Invalid authentication token',
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }
};

export default authMiddleware;
