import User from '../models/user.model.js';
import Certificate from '../models/certificate.model.js';
import { successResponse } from '../utils/responseUtils.js';
import { errorResponse, ErrorCodes } from '../utils/errorUtils.js';

/**
 * Get the current user's profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password -refreshToken');

    if (!user) {
      const { response, statusCode } = errorResponse('USER_NOT_FOUND', 'User not found');
      return res.status(statusCode).json(response);
    }

    return res.json(successResponse(user, 'User profile retrieved successfully'));
  } catch (error) {
    console.error('Error getting user profile:', error);
    const { response, statusCode } = errorResponse('INTERNAL_ERROR', 'Failed to get user profile');
    return res.status(statusCode).json(response);
  }
};

/**
 * Update the current user's profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    // Basic validation
    if (!name && !email) {
      const { response, statusCode } = errorResponse('INVALID_INPUT', 'No update data provided');
      return res.status(statusCode).json(response);
    }

    // Create update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Update user and return updated document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      const { response, statusCode } = errorResponse('USER_NOT_FOUND', 'User not found');
      return res.status(statusCode).json(response);
    }

    return res.json(successResponse(updatedUser, 'Profile updated successfully'));
  } catch (error) {
    console.error('Error updating user profile:', error);
    const { response, statusCode } = errorResponse('INTERNAL_ERROR', 'Failed to update profile');
    return res.status(statusCode).json(response);
  }
};

/**
 * Get statistics for the current user
 */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      const { response, statusCode } = errorResponse('USER_NOT_FOUND', 'User not found');
      return res.status(statusCode).json(response);
    }

    // Get different stats based on user role
    let stats = {};

    if (user.role === 'INSTITUTE') {
      // For institute users, get counts of issued certificates by status
      const certificateCounts = await Certificate.aggregate([
        { $match: { orgName: user.name } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
      ]);

      // Format the results
      const formattedCounts = {
        total: 0,
        pending: 0,
        confirmed: 0,
        failed: 0
      };

      certificateCounts.forEach(item => {
        if (item._id === 'PENDING') formattedCounts.pending = item.count;
        if (item._id === 'CONFIRMED') formattedCounts.confirmed = item.count;
        if (item._id === 'FAILED') formattedCounts.failed = item.count;
        formattedCounts.total += item.count;
      });

      stats = {
        certificatesIssued: formattedCounts,
        lastLogin: user.lastLogin,
        accountCreated: user.createdAt
      };
    } else {
      // For regular users, get counts of certificates they own
      const certificateCount = await Certificate.countDocuments({
        candidateName: user.name
      });

      stats = {
        certificatesOwned: certificateCount,
        lastLogin: user.lastLogin,
        accountCreated: user.createdAt,
        loginHistory: user.loginHistory?.slice(0, 5) || []
      };
    }

    return res.json(successResponse(stats, 'User statistics retrieved successfully'));
  } catch (error) {
    console.error('Error getting user stats:', error);
    const { response, statusCode } = errorResponse('INTERNAL_ERROR', 'Failed to get user statistics');
    return res.status(statusCode).json(response);
  }
};

/**
 * List all certificates for the current user
 * - For regular users: certificates where they are the candidate
 * - For institutes: certificates they have issued
 */
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      const { response, statusCode } = errorResponse('USER_NOT_FOUND', 'User not found');
      return res.status(statusCode).json(response);
    }

    let certificates = [];
    const { status, search } = req.query;

    // Build the query based on user role and optional filters
    let query = {};

    if (user.role === 'INSTITUTE') {
      query.orgName = user.name;
    } else {
      query.candidateName = user.name;
    }

    // Add status filter if provided
    if (status && ['PENDING', 'CONFIRMED', 'FAILED'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: 'i' } },
        { certificateId: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } }
      ];

      // For institutes, also search by candidate name
      if (user.role === 'INSTITUTE') {
        query.$or.push({ candidateName: { $regex: search, $options: 'i' } });
      }
    }

    // Execute the query
    certificates = await Certificate.find(query).sort({ createdAt: -1 });

    return res.json(successResponse(certificates, 'Certificates retrieved successfully'));
  } catch (error) {
    console.error('Error getting user certificates:', error);
    const { response, statusCode } = errorResponse('INTERNAL_ERROR', 'Failed to get certificates');
    return res.status(statusCode).json(response);
  }
}; 