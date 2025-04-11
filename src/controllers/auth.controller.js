import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { successResponse } from '../utils/responseUtils.js';
import { errorResponse, ErrorCodes } from '../utils/errorUtils.js';
import crypto from 'crypto';

dotenv.config();

export const register = async (req, res) => {
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    const { name, email, password, role } = req.body;

    console.log(`[${requestId}] Registration attempt for email: ${email}`);

    if (!name || !email || !password || !role) {
      const { response, statusCode } = errorResponse(
        'MISSING_REQUIRED_FIELD',
        'All fields are required',
        { required: ['name', 'email', 'password', 'role'] },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`[${requestId}] Email already exists: ${email}`);
      const { response, statusCode } = errorResponse(
        'DUPLICATE_RESOURCE',
        'Email already exists',
        { email },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Create new user
    const user = new User({ name, email, password, role });
    await user.save();
    console.log(`[${requestId}] New user created with ID: ${user._id}`);

    // Generate tokens directly (bypass User model methods)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET, // Using same secret for simplicity
      { expiresIn: '7d' }
    );

    // Store refresh token
    user.refreshToken = refreshToken;
    await user.save();
    console.log(`[${requestId}] Tokens generated for new user`);

    return res.status(201).json(successResponse({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tokens: {
        access: token,
        refresh: refreshToken
      }
    }, 'Registration successful', 201));

  } catch (error) {
    console.error(`[${requestId}] Registration error:`, error);
    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Registration failed',
      process.env.NODE_ENV === 'development' ? { error: error.message } : {},
      requestId
    );
    return res.status(statusCode).json(response);
  }
};

export const login = async (req, res) => {
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    const { email, password } = req.body;

    console.log(`[${requestId}] Login attempt for email: ${email}`);

    if (!email || !password) {
      const { response, statusCode } = errorResponse(
        'MISSING_REQUIRED_FIELD',
        'Email and password are required',
        { required: ['email', 'password'] },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      console.log(`[${requestId}] No user found with email: ${email}`);
      const { response, statusCode } = errorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        null,
        requestId
      );
      return res.status(statusCode).json(response);
    }

    console.log(`[${requestId}] User found: ${user._id}`);

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`[${requestId}] Invalid password for user: ${user._id}`);
      const { response, statusCode } = errorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        null,
        requestId
      );
      return res.status(statusCode).json(response);
    }

    console.log(`[${requestId}] Password validation successful`);

    // Generate tokens directly (using the approach from your working code)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Generate refresh token directly
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET, // Using same secret for simplicity
      { expiresIn: '7d' }
    );

    // Store refresh token on user
    user.refreshToken = refreshToken;
    await user.save();

    console.log(`[${requestId}] Tokens generated successfully`);

    // Track login if possible
    try {
      user.lastLogin = Date.now();
      if (Array.isArray(user.loginHistory)) {
        user.loginHistory.push({
          timestamp: Date.now(),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        if (user.loginHistory.length > 10) user.loginHistory.shift();
      }
      await user.save();
    } catch (trackError) {
      console.error(`[${requestId}] Login tracking error:`, trackError);
      // Non-critical, continue
    }

    // Return successful response with tokens
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    console.log(`[${requestId}] Login successful for user: ${user._id}`);

    return res.status(200).json(successResponse({
      user: userData,
      tokens: {
        access: token,
        refresh: refreshToken
      }
    }, 'Login successful'));

  } catch (error) {
    console.error(`[${requestId}] Login error:`, error);

    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Login failed due to an internal error',
      process.env.NODE_ENV === 'development' ? { error: error.message } : {},
      requestId
    );
    return res.status(statusCode).json(response);
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    if (!refreshToken) {
      const { response, statusCode } = errorResponse(
        'MISSING_REQUIRED_FIELD',
        'Refresh token is required',
        null,
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    } catch (err) {
      const { response, statusCode } = errorResponse(
        'TOKEN_EXPIRED',
        'Invalid or expired refresh token',
        null,
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      const { response, statusCode } = errorResponse(
        'UNAUTHORIZED',
        'Invalid refresh token',
        null,
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Generate new tokens
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();
    await user.save();

    return res.status(200).json(successResponse({
      tokens: {
        access: newAccessToken,
        refresh: newRefreshToken
      }
    }, 'Tokens refreshed successfully'));

  } catch (error) {
    console.error('Token refresh error:', error);
    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Failed to refresh token',
      {
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      requestId
    );
    return res.status(statusCode).json(response);
  }
};