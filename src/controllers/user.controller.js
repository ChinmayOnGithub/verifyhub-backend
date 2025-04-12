import User from '../models/user.model.js';
import Certificate from '../models/certificate.model.js';
import { successResponse } from '../utils/responseUtils.js';
import { errorResponse, ErrorCodes } from '../utils/errorUtils.js';
import { generateKeyPair, deriveWalletAddress } from '../utils/cryptoUtils.js';
import mongoose from 'mongoose';

/**
 * Get the current user's profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const includeKeys = req.query.includeKeys === 'true';

    console.log(`[getUserProfile] User ID: ${userId}, includeKeys: ${includeKeys}`);
    console.log(`[getUserProfile] Auth user info:`, JSON.stringify(req.user));

    // Initialize select with basic exclusion of sensitive data
    let select = { password: 0, refreshToken: 0 };

    // Handle case inconsistency by checking both formats
    const user = await User.findById(userId);
    console.log(`[getUserProfile] User role: ${user.role}`);

    // Check if this is an institute user (case insensitive check)
    const isInstitute = user.role.toUpperCase() === 'INSTITUTE';

    // For institute users, check if they need cryptographic keys generated
    if (isInstitute) {
      // Only generate keys if they don't already exist
      if (!user.publicKey || !user.privateKey || !user.walletAddress) {
        console.log('[getUserProfile] Keys missing, generating cryptographic keys for institute user');

        try {
          // Generate a new key pair
          const { publicKey, privateKey } = generateKeyPair();
          const walletAddress = deriveWalletAddress(publicKey);

          console.log('[getUserProfile] Keys generated successfully:');
          console.log(`[getUserProfile] - Wallet address length: ${walletAddress.length}`);
          console.log(`[getUserProfile] - Public key length: ${publicKey.length}`);
          console.log(`[getUserProfile] - Private key length: ${privateKey.length}`);

          // Update the user with the new keys
          user.publicKey = publicKey;
          user.privateKey = privateKey;
          user.walletAddress = walletAddress;

          // Save the updated user
          await user.save();
          console.log('[getUserProfile] Cryptographic keys generated and saved to database');
        } catch (error) {
          console.error('[getUserProfile] Error generating keys:', error.message);
        }
      } else {
        console.log('[getUserProfile] User already has cryptographic keys');
      }
    }

    // Determine if cryptographic keys should be included in response
    if (!isInstitute || !includeKeys) {
      // For non-institute users or when not explicitly requested, exclude crypto keys
      select.privateKey = 0;
      select.publicKey = 0;
      console.log('[getUserProfile] Excluding cryptographic keys');
    } else {
      console.log('[getUserProfile] Including cryptographic keys for INSTITUTE user');
    }

    // Fetch user with appropriate fields selected
    const profile = await User.findById(userId).select(select);

    if (!profile) {
      console.log(`User not found with ID: ${userId}`);
      const { response, statusCode } = errorResponse('USER_NOT_FOUND', 'User not found');
      return res.status(statusCode).json(response);
    }

    console.log(`User profile retrieved successfully for: ${profile.name}, role: ${profile.role}`);

    // Log crypto information availability (without exposing actual keys)
    if (includeKeys && isInstitute) {
      console.log(`Crypto data included in response: walletAddress=${!!profile.walletAddress}, publicKey=${!!profile.publicKey}, privateKey=${!!profile.privateKey}`);
    }

    // Add debug info to the response
    const userObject = profile.toObject();
    userObject.debug = {
      requestedIncludeKeys: includeKeys,
      userRole: profile.role,
      keysRequested: includeKeys && isInstitute,
      timestamp: new Date().toISOString(),
      hasPublicKey: !!userObject.publicKey,
      hasPrivateKey: !!userObject.privateKey,
      hasWalletAddress: !!userObject.walletAddress
    };

    console.log(`[getUserProfile] Response data:`, {
      role: userObject.role,
      name: userObject.name,
      hasPublicKey: !!userObject.publicKey,
      hasPrivateKey: !!userObject.privateKey,
      hasWalletAddress: !!userObject.walletAddress
    });

    return res.json(successResponse(userObject, 'User profile retrieved successfully'));
  } catch (error) {
    console.error('[getUserProfile] Error:', error.message);
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
        { $match: { issuer: new mongoose.Types.ObjectId(userId) } },
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
      console.log(`[getUserCertificates] Fetching certificates for INSTITUTE user: ${userId}`);
      // Try using ObjectId or string depending on what works
      query.issuer = userId;
    } else {
      console.log(`[getUserCertificates] Fetching certificates for ${user.role} user: ${userId}, name: ${user.name}`);
      query.candidateName = user.name;
    }

    console.log('[getUserCertificates] Query:', JSON.stringify(query));

    // Add status filter if provided
    if (status && ['PENDING', 'CONFIRMED', 'FAILED'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
      console.log(`[getUserCertificates] Adding status filter: ${status.toUpperCase()}`);
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
      console.log(`[getUserCertificates] Adding search filter: ${search}`);
    }

    // Execute the query
    certificates = await Certificate.find(query).sort({ createdAt: -1 });

    console.log(`[getUserCertificates] Found ${certificates.length} certificates`);

    // If no certificates found for institute user, try alternative query
    if (certificates.length === 0 && user.role === 'INSTITUTE') {
      console.log('[getUserCertificates] No certificates found for INSTITUTE, trying alternative query with orgName');

      // Try finding by organization name as fallback
      const altQuery = { orgName: user.name };
      if (status) altQuery.status = status.toUpperCase();

      const altCertificates = await Certificate.find(altQuery).sort({ createdAt: -1 });
      console.log(`[getUserCertificates] Alternative query found ${altCertificates.length} certificates`);

      if (altCertificates.length > 0) {
        // Update certificates with issuer field for future queries
        console.log('[getUserCertificates] Updating certificates with issuer field');
        for (const cert of altCertificates) {
          cert.issuer = userId;
          await cert.save();
        }
        certificates = altCertificates;
      }
    }

    return res.json(successResponse(certificates, 'Certificates retrieved successfully'));
  } catch (error) {
    console.error('Error getting user certificates:', error);
    const { response, statusCode } = errorResponse('INTERNAL_ERROR', 'Failed to get certificates');
    return res.status(statusCode).json(response);
  }
}; 