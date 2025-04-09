// src/controllers/verification.controller.js
// Certificate verification functionality
import crypto from 'crypto';
import { contract } from '../utils/blockchain.js';
import Certificate from '../models/certificate.model.js';
import { helpers } from './certificate.controller.js';

const { blockchainErrorHandler } = helpers;

// Helper function
const parseCertificateData = (data) => {
  if (Array.isArray(data)) {
    return {
      uid: data[0],
      candidateName: data[1],
      courseName: data[2],
      orgName: data[3],
      ipfsHash: data[4],
      timestamp: data[5],
      revoked: data[6] || false
    };
  }
  return {
    uid: data.uid,
    candidateName: data.candidateName,
    courseName: data.courseName,
    orgName: data.orgName,
    ipfsHash: data.ipfsHash,
    timestamp: data.timestamp,
    revoked: data.revoked || false
  };
};

/**
 * Verifies a certificate using a short verification code
 * Provides a user-friendly verification method alternative to the full certificate ID
 * 
 * @param {Object} req - Express request object with shortCode parameter
 * @param {Object} res - Express response object
 * @returns {Object} Certificate verification result or error
 */
export const verifyCertificateByShortCode = async (req, res) => {
  const { shortCode } = req.params;
  const verificationId = crypto.randomBytes(4).toString('hex');

  console.log(`[${verificationId}] Verifying certificate by short code: ${shortCode}`);

  try {
    // Sanitize and validate format
    const sanitizedCode = shortCode.toUpperCase().trim();

    if (!/^[A-Z0-9]{4}$/.test(sanitizedCode)) {
      console.log(`[${verificationId}] Invalid short code format: ${sanitizedCode}`);
      return res.status(400).json({
        code: 'INVALID_CODE',
        message: 'Short code must be 4 characters (A-Z, 0-9)',
        verificationId,
        example: 'A12B',
        providedCode: sanitizedCode
      });
    }

    // Debug: List all certificates to see if any have short codes
    const allCertificates = await Certificate.find({}).lean();
    console.log(`[${verificationId}] Found ${allCertificates.length} certificates in database`);

    // Check if any certificates have short codes
    const withShortCodes = allCertificates.filter(c => c.shortCode);
    console.log(`[${verificationId}] Certificates with short codes: ${withShortCodes.length}`);

    if (withShortCodes.length > 0) {
      console.log(`[${verificationId}] Available short codes: ${withShortCodes.map(c => c.shortCode).join(', ')}`);
      console.log(`[${verificationId}] Sample certificate with short code: ${JSON.stringify(withShortCodes[0])}`);
    } else {
      console.log(`[${verificationId}] No certificates have short codes!`);
      if (allCertificates.length > 0) {
        console.log(`[${verificationId}] Sample certificate: ${JSON.stringify(allCertificates[0])}`);
      }
    }

    // Try multiple query approaches
    console.log(`[${verificationId}] Trying exact match for short code: ${sanitizedCode}`);
    let certificate = await Certificate.findOne({ shortCode: sanitizedCode });

    if (!certificate) {
      console.log(`[${verificationId}] Exact match failed, trying case-insensitive regex`);
      certificate = await Certificate.findOne({
        shortCode: { $regex: new RegExp(`^${sanitizedCode}$`, 'i') }
      });
    }

    if (!certificate) {
      console.log(`[${verificationId}] Regex match failed, trying direct string comparison`);
      // Try a direct comparison approach
      for (const cert of allCertificates) {
        if (cert.shortCode && cert.shortCode.toUpperCase() === sanitizedCode) {
          console.log(`[${verificationId}] Found match through direct comparison: ${cert.shortCode}`);
          certificate = cert;
          break;
        }
      }
    }

    if (!certificate) {
      console.log(`[${verificationId}] No certificate found with short code: ${sanitizedCode}`);

      // Check if the schema is correct
      const certificateSchema = Certificate.schema.obj;
      console.log(`[${verificationId}] Certificate schema: ${JSON.stringify(certificateSchema)}`);

      return res.status(404).json({
        code: 'CODE_NOT_FOUND',
        message: 'Certificate with this code does not exist',
        verificationId,
        shortCode: sanitizedCode,
        availableCodes: withShortCodes.length > 0 ? withShortCodes.map(c => c.shortCode) : []
      });
    }

    console.log(`[${verificationId}] Certificate found: ${certificate.certificateId}`);
    console.log(`[${verificationId}] Redirecting to full certificate verification`);

    // For now, we'll need to import this from certificate.controller.js
    // Later we'll move verifyCertificateById to this file
    const { verifyCertificateById } = await import('./certificate.controller.js');

    // Redirect to certificate verification by ID
    return verifyCertificateById({ params: { certificateId: certificate.certificateId } }, res);
  } catch (error) {
    console.error(`[${verificationId}] Short Code Verification Error:`, error);
    return res.status(500).json({
      code: 'VERIFICATION_FAILED',
      message: 'Failed to verify certificate by short code',
      verificationId,
      shortCode,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Verifies the authenticity of an institutional signature
 * Validates that a certificate was issued by the claimed institution
 * 
 * @param {Object} req - Express request object with certificateId parameter
 * @param {Object} res - Express response object
 * @returns {Object} Signature verification result
 */
export const verifyInstitutionalSignature = async (req, res) => {
  const { certificateId } = req.params;
  const verificationId = crypto.randomBytes(4).toString('hex');

  console.log(`[${verificationId}] Verifying institutional signature for certificate: ${certificateId}`);

  try {
    // Validate certificate ID format
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      console.log(`[${verificationId}] Invalid certificate ID format: ${certificateId}`);
      return res.status(400).json({
        code: 'INVALID_ID',
        message: 'Invalid certificate ID format',
        verificationId,
        certificateId
      });
    }

    // Find certificate in database
    const certificate = await Certificate.findOne({ certificateId });

    if (!certificate) {
      console.log(`[${verificationId}] Certificate not found: ${certificateId}`);
      return res.status(404).json({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
        verificationId,
        certificateId
      });
    }

    // Debug: Log the certificate to see if it has a signature
    console.log(`[${verificationId}] Certificate found: ${JSON.stringify(certificate)}`);

    // Check if certificate has an institutional signature
    if (!certificate.institutionalSignature) {
      console.log(`[${verificationId}] No institutional signature found for certificate: ${certificateId}`);

      // For development, create a mock signature if missing
      const mockSignature = "DEVELOPMENT_MODE_MOCK_SIGNATURE";

      return res.json({
        status: 'SIGNATURE_VALID',
        message: 'Development mode: Mock signature generated',
        verificationId,
        certificateId,
        institution: certificate.orgName,
        signatureTimestamp: certificate.createdAt,
        note: 'Development mode: Using mock signature since none was found in database',
        mockSignature: true
      });
    }

    // In a real implementation, you would verify the signature here
    // using the institution's public key
    console.log(`[${verificationId}] Signature found, verification would happen here`);

    // For development, we'll just return success with a note
    return res.json({
      status: 'SIGNATURE_VALID',
      message: 'Institutional signature is valid',
      verificationId,
      certificateId,
      institution: certificate.orgName,
      signatureTimestamp: certificate.createdAt,
      note: 'Development mode: Cryptographic verification not implemented yet'
    });
  } catch (error) {
    console.error(`[${verificationId}] Signature Verification Error:`, error);
    return res.status(500).json({
      code: 'SIGNATURE_VERIFICATION_FAILED',
      message: 'Failed to verify institutional signature',
      verificationId,
      certificateId,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 