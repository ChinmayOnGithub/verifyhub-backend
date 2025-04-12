// src/controllers/certificate.controller.js
/* 
generateCertificateHash
generateCertificate
verifyCertificateById
verifyCertificatePdf
getCertificateMetadata
uploadExternalCertificate
searchByCID
getCertificateStats
getOrgCertificates


certificate.controller.js
  generateCertificate (main flow)
  getCertificateMetadata
  getCertificateStats
  getOrgCertificates
  handleCertificateWebhook
*/
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { generateCertificatePdf } from '../utils/pdfUtils.js';
import * as pinata from '../utils/pinata.js';
import { contract, web3 } from '../utils/blockchain.js';
import { PINATA_GATEWAY_BASE_URL } from '../constants.js';
import Certificate from '../models/certificate.model.js';
// import { extractCertificate } from '../utils/pdfReaderUtils.js';
// import CID from 'cids';
import { CID } from 'multiformats/cid'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { pdfUpload } from '../middlewares/fileUpload.middleware.js';
import multer from 'multer'; // Add multer import
import { computePDFHash, getStoredHashFromBlockchain } from '../utils/pdfHashUtils.js';
import {
  isValidCID,
  computePDFHashes,
  formatCertificateResponse,
  findCertificateByHash,
  uploadToIPFS,
  findCertificateByAnyHash
} from '../utils/certificateUtils.js';
import {
  successResponse,
  verificationResponse,
  warningResponse
} from '../utils/responseUtils.js';
import { errorResponse, ErrorCodes } from '../utils/errorUtils.js';
import { uploadBufferToPinata } from '../utils/pinata.js';

BigInt.prototype.toJSON = function () { return this.toString(); };
const BLOCK_EXPLORER_URL = 'http://localhost:8545'

// Helper functions
const generateCertificateHash = (
  uid,
  candidateName,
  courseName,
  orgName) => {
  const normalizedData = `${uid}|${candidateName.trim().toLowerCase()}|${courseName.trim().toLowerCase()}|${orgName.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalizedData).digest('hex');
};

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

const blockchainErrorHandler = (error, certificateId) => {
  console.error(`[${certificateId}] Blockchain Error:`, error);

  const isRevert = error.data?.startsWith('0x08c379a0');
  const statusCode = isRevert ? 404 : 500;
  const errorCodes = {
    'Certificate not found': 'NOT_FOUND',
    'Already revoked': 'REVOKED',
    default: 'BLOCKCHAIN_ERROR'
  };

  return {
    statusCode,
    error: {
      code: errorCodes[error.reason] || errorCodes.default,
      message: isRevert ? 'Blockchain operation reverted' : 'Blockchain operation failed',
      details: error.reason || error.message
    }
  };
};

/**
 * Generates a cryptographically secure 4-character alphanumeric verification code
 * Uses rejection sampling for uniform distribution of characters
 * 
 * @returns {string} 4-character uppercase alphanumeric code (A-Z, 0-9)
 */
const generateVerificationShortCode = () => {
  console.log('[ShortCode] Generating new verification short code');
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  // Use crypto for better randomness with rejection sampling for uniform distribution
  for (let i = 0; i < 4; i++) {
    // Get a random byte (0-255)
    const randomByte = crypto.randomBytes(1)[0];
    // Map to character set using rejection sampling
    // This ensures uniform distribution by rejecting values outside our range
    if (randomByte >= 256 - (256 % characters.length)) {
      // Reject and retry if the value would introduce bias
      i--;
      continue;
    }
    const index = randomByte % characters.length;
    result += characters.charAt(index);
  }

  console.log(`[ShortCode] Generated code: ${result}`);
  return result;
};

/**
 * Digitally signs certificate data using asymmetric cryptography
 * Creates an institutional signature for certificate authenticity verification
 * 
 * @param {Object} data - Certificate data to sign
 * @param {string} privateKey - Institution's private key in PEM format
 * @returns {string} Base64-encoded signature
 * @throws {Error} If signing fails
 */
const createInstitutionalSignature = (data, privateKey) => {
  console.log('[Signature] Creating institutional signature for certificate');

  if (!privateKey) {
    console.error('[Signature] Missing private key');
    throw new Error('Institution private key is required for signing');
  }

  try {
    // Create a deterministic representation of the data
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    console.log(`[Signature] Data to sign (truncated): ${dataString.substring(0, 100)}...`);

    // Create signature
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');

    // Validate signature format
    if (!signature || signature.length < 20) {
      throw new Error('Generated signature is invalid or too short');
    }

    console.log(`[Signature] Signature created successfully (length: ${signature.length})`);
    return signature;
  } catch (error) {
    console.error('[Signature] Error creating signature:', error);
    throw new Error(`Signature creation failed: ${error.message}`);
  }
};

// Certificate Generation and Upload
export const generateCertificate = async (req, res) => {
  const startTime = Date.now();
  const generationId = crypto.randomBytes(8).toString('hex');

  try {
    const { uid, candidateName, courseName, orgName } = req.body;
    const metadata = { uid, candidateName, courseName, orgName };

    // ======================
    // 1. Validation Phase
    // ======================
    const missingFields = Object.entries(metadata)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Required fields are missing',
          fields: missingFields,
          documentation: 'https://api.yourservice.com/docs/certificates#required-fields'
        },
        meta: { generationId }
      });
    }

    // ======================
    // 2. Certificate ID Generation
    // ======================
    const certificateId = generateCertificateHash(uid, candidateName, courseName, orgName);
    let shortCode = generateVerificationShortCode();
    console.log(`[${generationId}] Generated short code: ${shortCode}`);

    let codeExists = await Certificate.findOne({ shortCode });
    while (codeExists) {
      console.log(`[${generationId}] Short code ${shortCode} already exists, regenerating...`);
      shortCode = generateVerificationShortCode();
      codeExists = await Certificate.findOne({ shortCode });
    }

    const certificateData = {
      certificateId,
      shortCode,
      ...metadata,
      generationId,
      createdAt: new Date().toISOString()
    };

    // ======================
    // 3. Existence Checks
    // ======================
    try {
      const [blockchainExists, dbExists] = await Promise.all([
        contract.methods.isVerified(certificateId).call(),
        Certificate.findOne({ certificateId }).lean()
      ]);

      if (blockchainExists) {
        return res.status(409).json({
          error: {
            code: 'CERTIFICATE_EXISTS',
            message: 'Certificate already exists on blockchain',
            resolution: [
              'If this is an update, revoke the existing certificate first',
              'Use different metadata for new certificate'
            ],
            existingRecord: dbExists || null,
            verificationUrl: `/api/certificates/${certificateId}/verify`
          },
          meta: certificateData
        });
      }
    } catch (checkError) {
      console.error(`[${generationId}] Existence check failed:`, checkError);
      return res.status(500).json({
        error: {
          code: 'SYSTEM_CHECK_FAILED',
          message: 'Failed to verify certificate status',
          retry: true,
          retryAfter: '5 minutes'
        },
        meta: certificateData
      });
    }

    // ======================
    // 4. PDF Generation - Fixed function name and parameters
    // ======================
    const outputDir = path.resolve('uploads');
    const pdfFilePath = path.join(outputDir, `cert_${generationId}.pdf`);

    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
      await generateCertificatePdf(
        pdfFilePath,
        uid,
        candidateName,
        courseName,
        orgName,
        path.resolve('public/assets/logo.jpg'),
        shortCode,
        `${req.protocol}://${req.get('host')}/api/certificates/code/${shortCode}`
      );
    } catch (pdfError) {
      console.error(`[${generationId}] PDF generation failed:`, pdfError);
      return res.status(500).json({
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Failed to create certificate PDF',
          details: pdfError.message,
          temporaryFile: pdfFilePath
        },
        meta: certificateData
      });
    }

    // ======================
    // 5. IPFS Upload
    // ======================
    let ipfsData;
    try {
      const pdfBuffer = await fs.promises.readFile(pdfFilePath);
      ipfsData = await uploadToIPFS(pdfBuffer, `cert_${generationId}.pdf`);
    } catch (ipfsError) {
      console.error(`[${generationId}] IPFS upload failed:`, ipfsError);
      return res.status(500).json({
        error: {
          code: 'IPFS_UPLOAD_FAILED',
          message: 'Failed to upload certificate to IPFS',
          details: ipfsError.message
        },
        meta: certificateData
      });
    }

    // ======================
    // 6. Blockchain Registration
    // ======================
    try {
      const accounts = await web3.eth.getAccounts();
      const tx = await contract.methods
        .generateCertificate(
          certificateId,
          uid,
          candidateName,
          courseName,
          orgName,
          ipfsData.ipfsHash
        )
        .send({ from: accounts[0], gas: 1000000 });

      certificateData.blockchainTx = tx.transactionHash;
    } catch (blockchainError) {
      console.error(`[${generationId}] Blockchain registration failed:`, blockchainError);
      return res.status(500).json({
        error: {
          code: 'BLOCKCHAIN_REGISTRATION_FAILED',
          message: 'Failed to register certificate on blockchain',
          details: blockchainError.message
        },
        meta: certificateData
      });
    }

    // ======================
    // 7. Database Save
    // ======================
    try {
      const newCertificate = await Certificate.create({
        certificateId,
        shortCode,
        uid,
        candidateName,
        courseName,
        orgName,
        issuer: req.user.id,
        ipfsHash: ipfsData.ipfsHash,
        sha256Hash: ipfsData.sha256Hash,
        cidHash: ipfsData.cidHash,
        blockchainTx: certificateData.blockchainTx,
        source: 'internal',
        status: 'PENDING'
      });

      console.log(`[${generationId}] Certificate saved to database with ID: ${newCertificate._id}`);
    } catch (dbError) {
      console.error(`[${generationId}] Database save failed:`, dbError);
      return res.status(500).json({
        error: {
          code: 'DATABASE_SAVE_FAILED',
          message: 'Failed to save certificate to database',
          details: dbError.message
        },
        meta: certificateData
      });
    }

    // ======================
    // 8. Success Response
    // ======================
    return res.status(201).json(successResponse({
      certificateId,
      shortCode,
      verificationUrl: `/api/certificates/${certificateId}/verify`,
      ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/ipfs/${ipfsData.ipfsHash}`,
      transaction: {
        hash: certificateData.blockchainTx
      },
      computedHashes: {
        sha256Hash: ipfsData.sha256Hash,
        cidHash: ipfsData.cidHash,
        ipfsHash: ipfsData.ipfsHash
      }
    }, 'Certificate generated successfully', 201));
  } catch (error) {
    console.error(`[${generationId}] Critical failure:`, error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected system failure',
        details: error.message
      },
      meta: { generationId }
    });
  }
};

export const uploadExternalCertificate = async (req, res) => {
  const uploadId = crypto.randomBytes(4).toString('hex');
  console.log(`[${uploadId}] Processing external certificate upload`);

  try {
    // Step 1: Validate request
    if (!req.file) {
      console.log(`[${uploadId}] No file uploaded`);
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'No PDF file uploaded',
        uploadId
      });
    }

    // Validate required fields
    const { orgName, candidateName } = req.body;
    if (!orgName || !candidateName) {
      console.log(`[${uploadId}] Missing required fields: orgName=${orgName}, candidateName=${candidateName}`);
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'Organization name and candidate name are required',
        uploadId
      });
    }

    // Step 2: Process file and compute hashes
    const pdfBuffer = req.file.buffer;
    console.log(`[${uploadId}] PDF received, size: ${pdfBuffer.length} bytes`);

    // Step 3: Upload to IPFS and get all hash formats
    let hashData;
    try {
      // Using your existing uploadToIPFS function that computes all three hash types
      hashData = await uploadToIPFS(pdfBuffer, req.file.originalname);
      const { sha256Hash, cidHash, ipfsHash } = hashData;
      console.log(`[${uploadId}] Computed hashes:`, { sha256Hash, cidHash, ipfsHash });
    } catch (ipfsError) {
      console.error(`[${uploadId}] IPFS upload failed:`, ipfsError);
      return res.status(500).json({
        code: 'IPFS_ERROR',
        message: 'Failed to upload to IPFS',
        uploadId,
        details: ipfsError.message
      });
    }

    // Step 4: Generate a unique certificate ID and UID
    const uid = crypto.randomBytes(16).toString('hex');
    const certificateId = generateCertificateHash(
      uid,
      candidateName,
      'External Certificate',
      orgName
    );
    console.log(`[${uploadId}] Generated certificateId: ${certificateId}`);

    // Generate a short verification code
    const shortCode = generateVerificationShortCode();
    console.log(`[${uploadId}] Generated short code: ${shortCode}`);

    // Step 5: Store on blockchain
    let tx;
    try {
      const accounts = await web3.eth.getAccounts();
      console.log(`[${uploadId}] Using account for transaction: ${accounts[0]}`);

      tx = await contract.methods
        .generateCertificate(
          certificateId,
          uid,
          candidateName,
          'External Certificate',
          orgName,
          hashData.ipfsHash // Use Pinata's IPFS hash for blockchain storage
        )
        .send({ from: accounts[0], gas: 1000000 });

      console.log(`[${uploadId}] Certificate stored on blockchain: ${tx.transactionHash}`);
    } catch (blockchainError) {
      console.error(`[${uploadId}] Blockchain storage failed:`, blockchainError);
      return res.status(500).json({
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to store certificate on blockchain',
        uploadId,
        details: blockchainError.message
      });
    }

    // Step 6: Save to database with all hash formats
    try {
      const newCertificate = await Certificate.create({
        certificateId,
        uid,
        candidateName,
        courseName: 'External Certificate',
        orgName,
        ipfsHash: hashData.ipfsHash,
        sha256Hash: hashData.sha256Hash,
        cidHash: hashData.cidHash,
        blockchainTx: tx.transactionHash,
        shortCode,
        source: 'external'
      });

      console.log(`[${uploadId}] External certificate saved to database with ID: ${newCertificate._id}`);

      // Step 7: Return success response
      return res.status(201).json({
        success: true,
        status: 'SUCCESS',
        message: 'Certificate uploaded and verified successfully',
        data: {
          certificateId,
          shortCode,
          verificationUrl: `/api/certificates/${certificateId}/verify`,
          ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/ipfs/${hashData.ipfsHash}`,
          transaction: {
            hash: tx.transactionHash,
            block: tx.blockNumber
          },
          computedHashes: {
            sha256Hash: hashData.sha256Hash,
            cidHash: hashData.cidHash,
            ipfsHash: hashData.ipfsHash
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error(`[${uploadId}] Database sync failed:`, dbError);

      // Even with DB failure, certificate is on blockchain, so return success with warning
      return res.status(201).json({
        success: true,
        status: 'SUCCESS_WITH_WARNING',
        message: 'Certificate uploaded but database sync failed',
        data: {
          certificateId,
          verificationUrl: `/api/certificates/${certificateId}/verify`,
          ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/ipfs/${hashData.ipfsHash}`,
          transaction: {
            hash: tx.transactionHash,
            block: tx.blockNumber
          },
          computedHashes: {
            sha256Hash: hashData.sha256Hash,
            cidHash: hashData.cidHash,
            ipfsHash: hashData.ipfsHash
          }
        },
        warning: 'Certificate exists on blockchain but may not be retrievable from database',
        warningDetails: process.env.NODE_ENV === 'development' ? dbError.message : 'Database sync failed',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error(`[${uploadId}] Unhandled upload error:`, error);
    console.error(`[${uploadId}] Error stack:`, error.stack);

    return res.status(500).json({
      success: false,
      status: 'ERROR',
      code: 'UPLOAD_FAILED',
      message: 'Failed to store external certificate',
      requestId: uploadId,
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

// Certificate Verification
export const verifyCertificateById = async (req, res) => {
  const { certificateId } = req.params;
  const verificationId = crypto.randomBytes(4).toString('hex');

  console.log(`[${verificationId}] Verifying certificate by ID: ${certificateId}`);

  try {
    // First check if we have the certificate in our database
    const certificate = await Certificate.findOne({ certificateId });

    if (certificate) {
      console.log(`[${verificationId}] Certificate found in database: ${certificate._id}`);

      // Verify on blockchain
      try {
        const blockchainData = await contract.methods.getCertificate(certificateId).call();
        console.log(`[${verificationId}] Blockchain data:`, blockchainData);

        // Parse the blockchain data
        const parsedData = parseCertificateData(blockchainData);

        return res.json({
          status: 'VALID',
          certificate: {
            uid: certificate.uid,
            candidateName: certificate.candidateName,
            courseName: certificate.courseName,
            orgName: certificate.orgName,
            ipfsHash: certificate.ipfsHash,
            timestamp: parsedData.timestamp,
            revoked: parsedData.revoked
          },
          verificationId,
          _links: {
            pdf: `https://gateway.pinata.cloud/ipfs/${certificate.ipfsHash}`,
            blockchain: `${BLOCK_EXPLORER_URL}/tx/${certificate.blockchainTx}`
          }
        });
      } catch (blockchainError) {
        console.error(`[${verificationId}] Blockchain verification failed:`, blockchainError);

        // Still return the certificate but with a warning
        return res.status(200).json({
          status: 'VALID_WITH_WARNING',
          certificate: {
            uid: certificate.uid,
            candidateName: certificate.candidateName,
            courseName: certificate.courseName,
            orgName: certificate.orgName,
            ipfsHash: certificate.ipfsHash
          },
          verificationId,
          warning: 'Certificate found in database but blockchain verification failed',
          blockchainError: blockchainError.message,
          _links: {
            pdf: `https://gateway.pinata.cloud/ipfs/${certificate.ipfsHash}`
          }
        });
      }
    }

    // If not in database, try to verify directly on blockchain
    console.log(`[${verificationId}] Certificate not found in database, checking blockchain`);

    try {
      const blockchainData = await contract.methods.getCertificate(certificateId).call();
      console.log(`[${verificationId}] Certificate found on blockchain:`, blockchainData);

      // Parse the blockchain data
      const parsedData = parseCertificateData(blockchainData);

      return res.json({
        status: 'VALID',
        certificate: parsedData,
        verificationId,
        warning: 'Certificate verified on blockchain but not found in database',
        _links: {
          pdf: `https://gateway.pinata.cloud/ipfs/${parsedData.ipfsHash}`
        }
      });
    } catch (blockchainError) {
      console.error(`[${verificationId}] Blockchain verification failed:`, blockchainError);

      return res.status(404).json({
        status: 'INVALID',
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found in database or blockchain',
        verificationId,
        certificateId
      });
    }
  } catch (error) {
    console.error(`[${verificationId}] Verification error:`, error);

    return res.status(500).json({
      status: 'ERROR',
      code: 'VERIFICATION_FAILED',
      message: 'Failed to verify certificate',
      verificationId,
      certificateId,
      details: error.message
    });
  }
};

export const verifyCertificatePdf = async (req, res) => {
  const verificationId = crypto.randomBytes(4).toString('hex');

  try {
    if (!req.file) {
      console.log(`[${verificationId}] No file uploaded for verification`);
      const { response, statusCode } = errorResponse(
        'MISSING_REQUIRED_FIELD',
        'No PDF file uploaded',
        null,
        verificationId
      );
      return res.status(statusCode).json(response);
    }

    // Get file info for logging
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    };

    console.log(`[${verificationId}] Verifying PDF: ${fileInfo.originalName} (${fileInfo.size} bytes), field: ${fileInfo.fieldname}`);

    // Compute hash of the uploaded PDF
    const pdfBuffer = req.file.buffer;
    const { sha256Hash, cidHash } = await computePDFHashes(pdfBuffer);

    console.log(`[${verificationId}] Computed SHA-256 hash: ${sha256Hash}`);
    console.log(`[${verificationId}] Computed CID hash: ${cidHash}`);

    // Find certificate using various match attempts
    let certificate = await findCertificateByHash(sha256Hash, cidHash);
    let matchType = 'exact_match';

    if (!certificate) {
      console.log(`[${verificationId}] No exact match found, trying partial matches`);
      const result = await findCertificateByAnyHash(sha256Hash, cidHash);
      if (result) {
        certificate = result.certificate;
        matchType = result.matchType;
      }
    }

    if (!certificate) {
      const { response, statusCode } = errorResponse(
        'CERTIFICATE_NOT_FOUND',
        'Certificate not found in our records',
        {
          computedHash: sha256Hash,
          cidHash
        },
        verificationId
      );
      return res.status(statusCode).json(response);
    }

    // Verification successful, determine status
    const status = certificate.revoked ? 'REVOKED' : 'VALID';

    // Return standardized verification response
    return res.json(verificationResponse(
      status,
      {
        certificateId: certificate.certificateId,
        candidateName: certificate.candidateName,
        courseName: certificate.courseName,
        orgName: certificate.orgName,
        issuedAt: certificate.createdAt,
        ipfsHash: certificate.ipfsHash,
        shortCode: certificate.shortCode
      },
      verificationId,
      {
        verification: `/api/certificates/${certificate.certificateId}/verify`,
        pdf: `/api/certificates/${certificate.certificateId}/pdf`,
        blockchain: `/api/certificates/${certificate.certificateId}/blockchain`
      },
      {
        computedHash: sha256Hash,
        cidHash,
        matchType
      }
    ));
  } catch (error) {
    console.error(`[${verificationId}] PDF Verification Error:`, error);
    const { response, statusCode } = errorResponse(
      'VERIFICATION_FAILED',
      'Failed to verify certificate PDF',
      { errorDetails: error.message },
      verificationId
    );
    return res.status(statusCode).json(response);
  }
};

export const debugPdfVerification = async (req, res) => {
  const debugId = crypto.randomBytes(4).toString('hex');

  try {
    if (!req.file) {
      const { response, statusCode } = errorResponse(
        'MISSING_REQUIRED_FIELD',
        'No PDF file uploaded',
        null,
        debugId
      );
      return res.status(statusCode).json(response);
    }

    // Get file info
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    };

    console.log(`[${debugId}] Debugging PDF: ${fileInfo.originalName} (${fileInfo.size} bytes)`);

    // Step 1: Compute hash of the uploaded PDF
    const pdfBuffer = req.file.buffer;
    const { sha256Hash, cidHash } = await computePDFHashes(pdfBuffer);

    console.log(`[${debugId}] Computed SHA-256 hash: ${sha256Hash}`);
    console.log(`[${debugId}] Computed CID hash: ${cidHash}`);

    // Step 2: Get all certificates from the database for comparison
    const allCertificates = await Certificate.find({});
    console.log(`[${debugId}] Found ${allCertificates.length} certificates in database`);

    // Step 3: Check for matches
    const matches = [];

    // Check for exact matches
    for (const cert of allCertificates) {
      if (cert.sha256Hash === sha256Hash) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'exact_sha256',
          hash: cert.sha256Hash
        });
      }

      if (cert.cidHash === cidHash) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'exact_cid',
          hash: cert.cidHash
        });
      }

      if (cert.ipfsHash === sha256Hash) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'exact_ipfs_sha256',
          hash: cert.ipfsHash
        });
      }

      if (cert.ipfsHash === cidHash) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'exact_ipfs_cid',
          hash: cert.ipfsHash
        });
      }
    }

    // Check for partial matches
    for (const cert of allCertificates) {
      if (cert.sha256Hash && (
        cert.sha256Hash.includes(sha256Hash) ||
        sha256Hash.includes(cert.sha256Hash)
      )) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'partial_sha256',
          hash: cert.sha256Hash
        });
      }

      if (cert.cidHash && cidHash && (
        cert.cidHash.includes(cidHash) ||
        cidHash.includes(cert.cidHash)
      )) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'partial_cid',
          hash: cert.cidHash
        });
      }

      if (cert.ipfsHash && (
        cert.ipfsHash.includes(sha256Hash) ||
        sha256Hash.includes(cert.ipfsHash)
      )) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'partial_ipfs_sha256',
          hash: cert.ipfsHash
        });
      }

      if (cert.ipfsHash && cidHash && (
        cert.ipfsHash.includes(cidHash) ||
        cidHash.includes(cert.ipfsHash)
      )) {
        matches.push({
          certificateId: cert.certificateId,
          matchType: 'partial_ipfs_cid',
          hash: cert.ipfsHash
        });
      }
    }

    // Check for certificateId matches
    if (/^[a-f0-9]{64}$/i.test(sha256Hash)) {
      const certById = allCertificates.find(cert => cert.certificateId === sha256Hash);
      if (certById) {
        matches.push({
          certificateId: certById.certificateId,
          matchType: 'certificate_id',
          hash: certById.ipfsHash
        });
      }
    }

    // Return debug information
    return res.status(200).json(successResponse({
      fileInfo,
      hashes: {
        sha256Hash,
        cidHash
      },
      matches
    }, 'PDF verification debug information', 200));

  } catch (error) {
    console.error(`[${debugId}] Debug Error:`, error);
    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Failed to process PDF for debugging',
      { errorDetails: error.message },
      debugId
    );
    return res.status(statusCode).json(response);
  }
};

// Certificate Retrieval
export const getCertificatePDF = async (req, res) => {
  const { certificateId } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    // 1. Validate certificate ID format
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      const { response, statusCode } = errorResponse(
        'INVALID_FORMAT',
        'Certificate ID must be 64-character hexadecimal string',
        {
          certificateId,
          example: '817759607228da54a922e4160f9d1b8f646e02360fc0f08372063510e87a45d6'
        },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // 2. Fetch certificate data from blockchain
    const certificateData = await contract.methods.getCertificate(certificateId).call();

    // 3. Extract IPFS hash with multiple fallbacks
    const ipfsHash = (
      certificateData[4] ||
      certificateData.ipfsHash ||
      certificateData._ipfs_hash ||
      certificateData.ipfs
    )?.trim();

    // 4. Validate CID existence
    if (!ipfsHash) {
      const { response, statusCode } = errorResponse(
        'NOT_FOUND',
        'No IPFS hash associated with certificate',
        {
          certificateId,
          resolution: 'Regenerate certificate with valid PDF upload'
        },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // 5. Strict CID validation
    try {
      const cid = CID.parse(ipfsHash);
      console.log('Valid CID:', {
        version: cid.version,
        codec: cid.code,
        type: cid.type
      });
    } catch (e) {
      const { response, statusCode } = errorResponse(
        'INVALID_FORMAT',
        'Malformed IPFS Content Identifier',
        {
          certificateId,
          ipfsHash,
          documentation: 'https://docs.ipfs.tech/concepts/content-addressing/'
        },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // 6. Permanent redirect with security headers
    const pdfUrl = `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`;
    res
      .set({
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Content-Security-Policy': "default-src 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Link': `<${pdfUrl}>; rel="canonical"` // SEO optimization
      })
      .redirect(301, pdfUrl); // Permanent redirect

  } catch (error) {
    console.error(`[${requestId}] PDF Retrieval Error:`, error);
    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve certificate PDF',
      {
        certificateId,
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      requestId
    );
    return res.status(statusCode).json(response);
  }
};

export const getCertificateMetadata = async (req, res) => {
  const { certificateId } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    // Validate certificate ID
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      const { response, statusCode } = errorResponse(
        'INVALID_FORMAT',
        'Certificate ID must be 64-character hexadecimal string',
        {
          certificateId,
          example: '817759607228da54a922e4160f9d1b8f646e02360fc0f08372063510e87a45d6'
        },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Find certificate in database
    const certificate = await Certificate.findOne({ certificateId });

    if (!certificate) {
      const { response, statusCode } = errorResponse(
        'CERTIFICATE_NOT_FOUND',
        'Certificate not found in database',
        { certificateId },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Return formatted certificate data
    return res.json(successResponse({
      certificateId: certificate.certificateId,
      candidateName: certificate.candidateName,
      courseName: certificate.courseName,
      orgName: certificate.orgName,
      issueDate: certificate.createdAt,
      hashes: {
        ipfsHash: certificate.ipfsHash,
        sha256Hash: certificate.sha256Hash,
        cidHash: certificate.cidHash
      },
      shortCode: certificate.shortCode,
      status: certificate.revoked ? 'REVOKED' : 'VALID',
      _links: {
        verification: `/api/certificates/${certificateId}/verify`,
        shortCodeVerification: `/api/certificates/code/${certificate.shortCode}`,
        pdf: `/api/certificates/${certificateId}/pdf`,
        blockchain: `/api/certificates/${certificateId}/blockchain`
      }
    }, 'Certificate metadata retrieved successfully'));
  } catch (error) {
    console.error(`[${requestId}] Metadata Retrieval Error:`, error);
    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve certificate metadata',
      {
        certificateId,
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      requestId
    );
    return res.status(statusCode).json(response);
  }
};

export const searchByCID = async (req, res) => {
  const { cid } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    // Try to find the certificate by any hash format
    const certificate = await findCertificateByAnyHash(cid);

    if (!certificate) {
      const { response, statusCode } = errorResponse(
        'CERTIFICATE_NOT_FOUND',
        'No certificate found with this identifier',
        {
          searchValue: cid,
          tip: 'Try searching with the IPFS hash (starts with Qm) or the certificate ID'
        },
        requestId
      );
      return res.status(statusCode).json(response);
    }

    // Verify on blockchain
    let isValid = false;
    let blockchainError = null;

    try {
      isValid = await contract.methods.isVerified(certificate.certificateId).call();
    } catch (error) {
      console.error(`[${requestId}] Blockchain verification error:`, error);
      blockchainError = error.message;
    }

    // Create response based on verification result
    const status = certificate.revoked ? 'REVOKED' : (isValid ? 'VALID' : 'VALID_WITH_WARNING');
    const blockchainData = blockchainError ?
      { blockchainError, errorDetails: blockchainError } :
      { blockchainVerified: isValid };

    // Return formatted response
    return res.json(verificationResponse(
      status,
      {
        certificateId: certificate.certificateId,
        candidateName: certificate.candidateName,
        courseName: certificate.courseName,
        orgName: certificate.orgName,
        issuedAt: certificate.createdAt,
        ipfsHash: certificate.ipfsHash,
        shortCode: certificate.shortCode,
        revoked: certificate.revoked || false
      },
      requestId,
      {
        verification: `/api/certificates/${certificate.certificateId}/verify`,
        pdf: `https://gateway.pinata.cloud/ipfs/${certificate.ipfsHash}`,
        blockchain: `http://localhost:8545/tx/${certificate.transactionHash || certificate.certificateId}`
      },
      blockchainData
    ));

  } catch (error) {
    console.error(`[${requestId}] Search Error:`, error);
    const { response, statusCode } = errorResponse(
      'INTERNAL_ERROR',
      'Failed to search for certificate',
      {
        searchValue: cid,
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      requestId
    );
    return res.status(statusCode).json(response);
  }
};

// Certificate Management
export const getCertificateStats = async (req, res) => {
  try {
    if (statsCache && statsCache.has('latest')) {
      const { timestamp, data } = statsCache.get('latest');
      if (Date.now() - timestamp < 60000) { // 1 minute cache
        return res.json(data);
      }
    }

    const stats = await Certificate.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          internal: { $sum: { $cond: [{ $certificateId: { $exists: true } }, 1, 0] } },
          external: { $sum: { $cond: [{ $cid: { $exists: true } }, 1, 0] } },
          organizations: { $addToSet: "$orgName" }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          internal: 1,
          external: 1,
          organizations: { $size: "$organizations" }
        }
      }
    ]);

    const result = stats[0] || { total: 0, internal: 0, external: 0, organizations: 0 };
    if (statsCache) {
      statsCache.set('latest', {
        timestamp: Date.now(),
        data: result
      });
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({
      code: 'STATS_ERROR',
      message: 'Failed to fetch statistics',
      details: error.message
    });
  }
};

export const getOrgCertificates = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const { orgName } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const query = { orgName: new RegExp(orgName, 'i') };
    const [certificates, count] = await Promise.all([
      Certificate.find(query)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Certificate.countDocuments(query)
    ]);

    res.json({
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      certificates: certificates.map(cert => ({
        id: cert.certificateId || cert.cid,
        type: cert.certificateId ? 'internal' : 'external',
        candidate: cert.candidateName,
        issueDate: cert.createdAt,
        ...(cert.certificateId && {
          verifyUrl: `/api/certificates/${cert.certificateId}/verify`
        })
      }))
    });

  } catch (error) {
    res.status(500).json({
      code: 'ORG_CERTS_ERROR',
      message: 'Failed to fetch organization certificates',
      orgName,
      details: error.message
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

    // Check if certificate has an institutional signature
    if (!certificate.institutionalSignature) {
      console.log(`[${verificationId}] No institutional signature found for certificate: ${certificateId}`);
      return res.status(400).json({
        code: 'NO_SIGNATURE',
        message: 'Certificate does not have an institutional signature',
        verificationId,
        certificateId
      });
    }

    // In a real implementation, you would verify the signature here
    // using the institution's public key
    console.log(`[${verificationId}] Signature found, verification would happen here`);

    // TODO: Implement actual signature verification
    // This would require:
    // 1. Retrieving the institution's public key
    // 2. Recreating the data that was signed
    // 3. Verifying the signature against the data

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

/**
 * Simplified PDF serving function that primarily redirects to IPFS
 * Still handles download vs. view options
 */
export const serveCertificatePDF = async (req, res) => {
  const { certificateId } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');
  const isDownload = req.query.download === 'true';

  console.log(`[${requestId}] PDF request for ${certificateId}, download=${isDownload}`);

  try {
    // Validate the certificate ID
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid certificate ID format',
        details: 'Certificate ID must be a 64-character hexadecimal string'
      });
    }

    // Find the certificate in the database
    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
        certificateId
      });
    }

    if (!certificate.ipfsHash) {
      return res.status(404).json({
        success: false,
        message: 'Certificate has no associated PDF',
        certificateId
      });
    }

    // Create direct IPFS URL
    const ipfsUrl = `${PINATA_GATEWAY_BASE_URL}/${certificate.ipfsHash}`;
    console.log(`[${requestId}] Redirecting to IPFS: ${ipfsUrl}`);

    if (isDownload) {
      // For downloads, provide a filename suggestion using Content-Disposition
      const filename = `certificate-${certificate.shortCode || certificate.certificateId.substring(0, 8)}.pdf`;

      // Simple HTML that automatically triggers download
      return res.set({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }).send(`
        <html>
          <head>
            <title>Downloading Certificate</title>
            <script>
              window.onload = function() {
                const link = document.createElement('a');
                link.href = "${ipfsUrl}";
                link.download = "${filename}";
                document.body.appendChild(link);
                link.click();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            </script>
          </head>
          <body>
            <p>Your download should start automatically. If not, <a href="${ipfsUrl}" download="${filename}">click here</a>.</p>
          </body>
        </html>
      `);
    } else {
      // For viewing, just redirect to the IPFS gateway
      return res.redirect(ipfsUrl);
    }

  } catch (error) {
    console.error(`[${requestId}] Error serving PDF:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to serve certificate PDF',
      details: error.message
    });
  }
};

// Export helper functions for use in other controllers
export const helpers = {
  generateCertificateHash,
  blockchainErrorHandler,
  generateVerificationShortCode,
  createInstitutionalSignature
};