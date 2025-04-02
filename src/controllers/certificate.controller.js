// src/controllers/certificateController.js
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
    const certificateData = {
      certificateId,
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
    // 4. PDF Generation
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
        path.resolve('public/assets/logo.jpg')
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
    // 5. Compute PDF Hashes
    // ======================
    let sha256Hash, cidHash;
    try {
      const pdfBuffer = await fs.promises.readFile(pdfFilePath);
      const hashes = await computePDFHashes(pdfBuffer);
      sha256Hash = hashes.sha256Hash;
      cidHash = hashes.cidHash;
      console.log(`[${generationId}] Computed hashes:`, { sha256Hash, cidHash });
    } catch (hashError) {
      console.error(`[${generationId}] Hash computation failed:`, hashError);
      return res.status(500).json({
        error: {
          code: 'HASH_COMPUTATION_FAILED',
          message: 'Failed to compute PDF hashes',
          details: hashError.message
        },
        meta: certificateData
      });
    }

    // ======================
    // 6. IPFS Upload
    // ======================
    let ipfsHash;
    try {
      ipfsHash = await pinata.uploadToPinata(pdfFilePath);
      new CID(ipfsHash); // Validate CID format
    } catch (ipfsError) {
      console.error(`[${generationId}] IPFS operation failed:`, ipfsError);
      return res.status(502).json({
        error: {
          code: ipfsError instanceof CID.CIDError ? 'INVALID_CID' : 'IPFS_UPLOAD_FAILED',
          message: 'IPFS operation failed',
          details: ipfsError.message,
          cid: ipfsHash || 'N/A'
        },
        meta: certificateData
      });
    } finally {
      await fs.promises.unlink(pdfFilePath).catch(() => { });
    }

    // ======================
    // 7. Blockchain Transaction (Updated)
    // ======================
    let txReceipt;
    try {
      const accounts = await web3.eth.getAccounts();
      txReceipt = await contract.methods
        .generateCertificate(certificateId, uid, candidateName, courseName, orgName, ipfsHash)
        .send({
          from: accounts[0],
          gas: 500000,
          gasPrice: web3.utils.toWei('20', 'gwei')
        });

      // Convert BigInt values to strings
      txReceipt = {
        ...txReceipt,
        blockNumber: txReceipt.blockNumber?.toString(),
        gasUsed: txReceipt.gasUsed?.toString(),
        cumulativeGasUsed: txReceipt.cumulativeGasUsed?.toString()
      };
    } catch (blockchainError) {
      const { statusCode, error } = blockchainErrorHandler(blockchainError, certificateId);
      return res.status(statusCode).json({
        error,
        meta: {
          ...certificateData,
          ipfsHash,
          blockchainAttempted: true
        }
      });
    }

    // ======================
    // 8. Database Sync
    // ======================
    try {
      const newCertificate = await Certificate.create({
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash,
        sha256Hash,
        cidHash,
        blockchainTx: txReceipt.transactionHash,
        generationMetadata: {
          id: generationId,
          durationMs: Date.now() - startTime,
          nodeVersion: process.version
        }
      });

      console.log(`[${generationId}] Certificate saved to database with ID: ${newCertificate._id}`);
    } catch (dbError) {
      console.error(`[${generationId}] Database sync failed:`, dbError);

      // Return a partial success response with a warning
      return res.status(201).json({
        success: {
          code: 'CERTIFICATE_ISSUED_WITH_WARNING',
          message: 'Certificate generated but database sync failed',
          timestamp: new Date().toISOString(),
          warning: 'Certificate exists on blockchain but may not be retrievable from database',
          links: {
            verification: `${req.protocol}://${req.get('host')}/api/certificates/${certificateId}/verify`,
            pdf: `${req.protocol}://${req.get('host')}/api/certificates/${certificateId}/pdf`,
            blockchainExplorer: explorerUrl,
            ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`
          }
        },
        certificate: {
          ...certificateData,
          ipfsHash,
          sha256Hash,
          cidHash,
          revoked: false,
          timestamp: Date.now()
        },
        transaction: {
          hash: txReceipt.transactionHash,
          block: txReceipt.blockNumber?.toString(),
          gasUsed: txReceipt.gasUsed?.toString(),
          networkId: networkId.toString()
        },
        system: {
          generationId,
          durationMs: (Date.now() - startTime).toString(),
          commitHash: process.env.GIT_COMMIT_HASH || 'unknown',
          dbError: process.env.NODE_ENV === 'development' ? dbError.message : 'Database sync failed'
        }
      });
    }
    // ======================
    // 9. Final Response (Updated)
    // ======================
    const networkId = (await web3.eth.net.getId()).toString(); // Convert to string

    const explorerUrl = networkId === "5777" // Compare as string
      ? `http://localhost:8545/tx/${txReceipt.transactionHash}`
      : `https://etherscan.io/tx/${txReceipt.transactionHash}`;

    res.status(201).json({
      success: {
        code: 'CERTIFICATE_ISSUED',
        message: 'Certificate successfully generated',
        timestamp: new Date().toISOString(),
        links: {
          verification: `${req.protocol}://${req.get('host')}/api/certificates/${certificateId}/verify`,
          pdf: `${req.protocol}://${req.get('host')}/api/certificates/${certificateId}/pdf`,
          blockchainExplorer: explorerUrl,
          ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`
        }
      },
      certificate: {
        ...certificateData,
        ipfsHash,
        sha256Hash,
        cidHash,
        revoked: false,
        timestamp: Date.now()
      },
      transaction: {
        hash: txReceipt.transactionHash,
        block: txReceipt.blockNumber?.toString(), // Already safe
        gasUsed: txReceipt.gasUsed?.toString(),   // Convert to string
        networkId: networkId.toString()           // Ensure string
      },
      system: {
        generationId,
        durationMs: (Date.now() - startTime).toString(), // Convert to string
        commitHash: process.env.GIT_COMMIT_HASH || 'unknown'
      }
    });

  } catch (error) {
    console.error(`[${generationId}] Critical failure:`, error);
    res.status(500).json({
      error: {
        code: 'UNKNOWN_FAILURE',
        message: 'Unexpected system failure',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        reportUrl: `https://api.yourservice.com/error-report/${generationId}`,
        critical: true
      },
      meta: {
        generationId,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

export const uploadExternalCertificate = async (req, res) => {
  const uploadId = crypto.randomBytes(4).toString('hex');

  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'No PDF file uploaded',
        uploadId
      });
    }

    // Validate required fields
    const { orgName, candidateName } = req.body;
    if (!orgName || !candidateName) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'Organization name and candidate name are required',
        uploadId
      });
    }

    // Process file and compute hashes
    const pdfBuffer = req.file.buffer;

    // Upload to IPFS and get all hash formats
    const { sha256Hash, cidHash, ipfsHash } = await uploadToIPFS(pdfBuffer, req.file.originalname);
    console.log(`[${uploadId}] Computed hashes:`, { sha256Hash, cidHash, ipfsHash });

    // Generate a unique certificate ID
    const certificateId = generateCertificateHash(
      crypto.randomBytes(16).toString('hex'),
      candidateName,
      'External Certificate',
      orgName
    );

    // Store on blockchain
    const accounts = await web3.eth.getAccounts();
    const tx = await contract.methods
      .generateCertificate(
        certificateId,
        crypto.randomBytes(16).toString('hex'),
        candidateName,
        'External Certificate',
        orgName,
        ipfsHash  // Use Pinata's IPFS hash for blockchain storage
      )
      .send({ from: accounts[0], gas: 1000000 });

    // Save to database with all hash formats
    try {
      const newCertificate = await Certificate.create({
        certificateId,
        uid: crypto.randomBytes(16).toString('hex'),
        candidateName,
        courseName: 'External Certificate',
        orgName,
        ipfsHash,    // Pinata's IPFS hash
        sha256Hash,  // Direct file hash
        cidHash,     // Our computed CID
        blockchainTx: tx.transactionHash,
        source: 'external'
      });

      console.log(`[${uploadId}] External certificate saved to database with ID: ${newCertificate._id}`);

      res.status(201).json({
        status: 'UPLOADED',
        certificateId,
        verificationUrl: `/api/certificates/${certificateId}/verify`,
        ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`,
        transaction: {
          hash: tx.transactionHash,
          block: tx.blockNumber
        },
        computedHashes: {
          sha256Hash,
          cidHash,
          ipfsHash
        }
      });
    } catch (dbError) {
      console.error(`[${uploadId}] Database sync failed:`, dbError);
      return res.status(201).json({
        status: 'UPLOADED_WITH_WARNING',
        message: 'Certificate uploaded but database sync failed',
        certificateId,
        verificationUrl: `/api/certificates/${certificateId}/verify`,
        ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`,
        transaction: {
          hash: tx.transactionHash,
          block: tx.blockNumber
        },
        warning: 'Certificate exists on blockchain but may not be retrievable from database',
        dbError: process.env.NODE_ENV === 'development' ? dbError.message : 'Database sync failed',
        computedHashes: {
          sha256Hash,
          cidHash,
          ipfsHash
        }
      });
    }

  } catch (error) {
    console.error(`[${uploadId}] Upload Error:`, error);
    res.status(500).json({
      code: 'UPLOAD_FAILED',
      message: 'Failed to store external certificate',
      uploadId,
      details: error.message
    });
  }
};

// Certificate Verification
export const verifyCertificateById = async (req, res) => {
  const { certificateId } = req.params;
  const verificationId = crypto.randomBytes(4).toString('hex');
  let certificateData = null;
  let isValid = false;

  try {
    // 1. Validate ID format
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      return res.status(400).json({
        code: 'INVALID_ID',
        message: 'Invalid certificate ID format',
        certificateId,
        verificationId
      });
    }

    // 2. Get blockchain data
    try {
      [isValid, certificateData] = await Promise.all([
        contract.methods.isVerified(certificateId).call(),
        contract.methods.getCertificate(certificateId).call()
      ]);
    } catch (blockchainError) {
      const { statusCode, error } = blockchainErrorHandler(blockchainError, certificateId);
      return res.status(statusCode).json({
        error,
        verificationId
      });
    }

    // 3. Handle invalid certificate
    if (!isValid) {
      return res.status(404).json({
        code: 'CERTIFICATE_INVALID',
        message: 'Certificate not found or revoked',
        certificateId,
        verificationId
      });
    }

    // 4. Enhanced parser with timestamp safety
    const parseCertificate = (data) => {
      // Handle numeric indexes first
      if (typeof data === 'object' && data !== null && '0' in data) {
        return {
          uid: data[0] || data._uid,
          candidateName: data[1] || data._candidate_name,
          courseName: data[2] || data._course_name,
          orgName: data[3] || data._org_name,
          ipfsHash: data[4] || data._ipfs_hash,
          // Add fallback for timestamp at different positions
          timestamp: data[5] || data.blockNumber || data._timestamp || Date.now(),
          revoked: data[6] || data._revoked || false
        };
      }

      // Handle named properties
      return {
        uid: data.uid || data._uid,
        candidateName: data.candidateName || data._candidate_name,
        courseName: data.courseName || data._course_name,
        orgName: data.orgName || data._org_name,
        ipfsHash: data.ipfsHash || data._ipfs_hash,
        timestamp: data.timestamp || data.blockNumber || data._timestamp || Date.now(),
        revoked: data.revoked || data._revoked || false
      };
    };

    // 5. Parse data with safety checks
    const parsed = parseCertificate(certificateData);

    // 6. Validate required fields
    if (!parsed.uid || !parsed.candidateName || !parsed.ipfsHash) {
      return res.status(500).json({
        code: 'INCOMPLETE_DATA',
        message: 'Certificate data missing critical fields',
        certificateId,
        verificationId,
        presentFields: {
          uid: !!parsed.uid,
          candidateName: !!parsed.candidateName,
          ipfsHash: !!parsed.ipfsHash
        }
      });
    }

    // 7. Validate CID
    CID.parse(parsed.ipfsHash.trim());

    // 8. Safely handle timestamp conversion
    const safeTimestamp = parsed.timestamp ? parsed.timestamp.toString() : Date.now().toString();

    // 9. Return validated response
    res.json({
      status: 'VALID',
      certificate: {
        uid: parsed.uid,
        candidateName: parsed.candidateName,
        courseName: parsed.courseName,
        orgName: parsed.orgName,
        ipfsHash: parsed.ipfsHash,
        timestamp: safeTimestamp,
        revoked: Boolean(parsed.revoked)
      },
      verificationId,
      _links: {
        pdf: `${PINATA_GATEWAY_BASE_URL}/${parsed.ipfsHash}`,
        blockchain: `${BLOCK_EXPLORER_URL}/tx/${certificateId}`
      }
    });

  } catch (error) {
    console.error(`[${verificationId}] Verification Failed:`, error);

    // const safeTimestamp = parsed.timestamp ? parsed.timestamp.toString() : Date.now().toString();

    const response = {
      code: 'VERIFICATION_FAILED',
      message: 'Certificate verification process failed',
      certificateId,
      verificationId,
      details: error.message,
      // timestamp: safeTimestamp,
      // issueDate: new Date(Number(safeTimestamp)).toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          rawData: certificateData,
          errorStack: error.stack
        }
      })
    };

    res.status(500).json(response);
  }
};

export const verifyCertificatePdf = async (req, res) => {
  const verificationId = crypto.randomBytes(4).toString('hex');

  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'No PDF file uploaded',
        verificationId
      });
    }

    // Get file info
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    };

    console.log(`[${verificationId}] Verifying PDF: ${fileInfo.originalName} (${fileInfo.size} bytes)`);

    // Compute hash of the uploaded PDF
    const pdfBuffer = req.file.buffer;
    const { sha256Hash, cidHash } = await computePDFHashes(pdfBuffer);

    console.log(`[${verificationId}] Computed SHA-256 hash: ${sha256Hash}`);
    console.log(`[${verificationId}] Computed CID hash: ${cidHash}`);

    // Get all certificates from the database for comparison
    const allCertificates = await Certificate.find({});
    console.log(`[${verificationId}] Found ${allCertificates.length} certificates in database`);

    // Log all stored hashes for debugging
    console.log(`[${verificationId}] All stored certificates:`, allCertificates.map(cert => ({
      certificateId: cert.certificateId,
      sha256Hash: cert.sha256Hash,
      cidHash: cert.cidHash,
      ipfsHash: cert.ipfsHash
    })));

    // Try to find certificate in database by SHA-256 hash
    let certificate = await Certificate.findOne({ sha256Hash: sha256Hash });
    let matchType = 'exact_sha256';
    console.log(`[${verificationId}] SHA-256 match:`, certificate ? 'Found' : 'Not found');

    // If not found by SHA-256, try to find by CID hash
    if (!certificate && cidHash) {
      console.log(`[${verificationId}] No match found with SHA-256 hash, trying CID hash`);
      certificate = await Certificate.findOne({ cidHash: cidHash });
      if (certificate) {
        matchType = 'exact_cid';
        console.log(`[${verificationId}] CID match found`);
      }
    }

    // If still not found, try to find by IPFS hash
    if (!certificate) {
      console.log(`[${verificationId}] No match found with computed hashes, trying IPFS hash`);
      certificate = await Certificate.findOne({ ipfsHash: sha256Hash });
      if (certificate) {
        matchType = 'exact_ipfs';
        console.log(`[${verificationId}] IPFS match found`);
      }
    }

    // If still not found, try to find by certificateId
    if (!certificate) {
      console.log(`[${verificationId}] No match found with hashes, trying certificateId`);
      if (/^[a-f0-9]{64}$/i.test(sha256Hash)) {
        certificate = await Certificate.findOne({ certificateId: sha256Hash });
        if (certificate) {
          matchType = 'certificate_id';
          console.log(`[${verificationId}] Certificate ID match found`);
        }
      }
    }

    // If still not found, try partial match
    if (!certificate) {
      console.log(`[${verificationId}] No exact match found, trying partial match`);

      for (const cert of allCertificates) {
        // Check if the computed hash is contained in any of the certificate's hash fields
        if (cert.sha256Hash && (cert.sha256Hash.includes(sha256Hash) || sha256Hash.includes(cert.sha256Hash))) {
          console.log(`[${verificationId}] Found partial match with SHA-256 hash: ${cert.certificateId}`);
          certificate = cert;
          matchType = 'partial_sha256';
          break;
        }

        if (cert.cidHash && cidHash && (cert.cidHash.includes(cidHash) || cidHash.includes(cert.cidHash))) {
          console.log(`[${verificationId}] Found partial match with CID hash: ${cert.certificateId}`);
          certificate = cert;
          matchType = 'partial_cid';
          break;
        }

        if (cert.ipfsHash && (cert.ipfsHash.includes(sha256Hash) || sha256Hash.includes(cert.ipfsHash))) {
          console.log(`[${verificationId}] Found partial match with IPFS hash: ${cert.certificateId}`);
          certificate = cert;
          matchType = 'partial_ipfs';
          break;
        }

        if (cert.ipfsHash && cidHash && (cert.ipfsHash.includes(cidHash) || cidHash.includes(cert.ipfsHash))) {
          console.log(`[${verificationId}] Found partial match with IPFS hash and CID: ${cert.certificateId}`);
          certificate = cert;
          matchType = 'partial_ipfs_cid';
          break;
        }
      }
    }

    if (certificate) {
      console.log(`[${verificationId}] Certificate found: ${certificate.certificateId} (Match type: ${matchType})`);

      // Verify on blockchain
      console.log(`[${verificationId}] Verifying on blockchain...`);
      const [isValid, blockchainData] = await Promise.all([
        contract.methods.isVerified(certificate.certificateId).call(),
        contract.methods.getCertificate(certificate.certificateId).call()
      ]);

      if (!isValid) {
        console.log(`[${verificationId}] Certificate found in database but invalid on blockchain`);
        return res.status(400).json({
          code: 'CERTIFICATE_INVALID',
          message: 'Certificate exists but is not valid on blockchain',
          verificationId,
          computedHash: sha256Hash,
          cidHash,
          certificateId: certificate.certificateId
        });
      }

      // Parse blockchain data
      const parsedData = parseCertificateData(blockchainData);
      console.log(`[${verificationId}] Blockchain verification successful`);

      // Return success response with both database and blockchain data
      return res.json({
        status: 'VALID',
        certificate: {
          id: certificate._id,
          certificateId: certificate.certificateId,
          candidateName: certificate.candidateName,
          courseName: certificate.courseName,
          orgName: certificate.orgName,
          issuedAt: certificate.createdAt,
          source: certificate.source,
          blockchainData: parsedData
        },
        verificationId,
        computedHash: sha256Hash,
        cidHash,
        matchType,
        blockchainValid: true,
        _links: {
          verification: `/api/certificates/${certificate.certificateId}/verify`,
          pdf: `/api/certificates/${certificate.certificateId}/pdf`,
          blockchain: `/api/certificates/${certificate.certificateId}/blockchain`
        }
      });
    } else {
      console.log(`[${verificationId}] No matching certificate found`);

      // Return not found response
      return res.status(404).json({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'No matching certificate found',
        verificationId,
        computedHash: sha256Hash,
        cidHash
      });
    }
  } catch (error) {
    console.error(`[${verificationId}] Verification Error:`, error);
    return res.status(500).json({
      code: 'VERIFICATION_FAILED',
      message: 'Failed to verify certificate',
      verificationId,
      details: error.message
    });
  }
};

export const debugPdfVerification = async (req, res) => {
  const debugId = crypto.randomBytes(4).toString('hex');

  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'No PDF file uploaded',
        debugId
      });
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
    return res.json({
      debugId,
      fileInfo: {
        name: fileInfo.originalName,
        size: fileInfo.size,
        type: fileInfo.mimeType
      },
      computedHashes: {
        sha256Hash,
        cidHash
      },
      verification: {
        status: matches.length > 0 ? 'MATCH_FOUND' : 'NO_MATCH',
        totalCertificates: allCertificates.length,
        matches: matches.length > 0 ? matches : 'No matches found',
        matchTypes: matches.map(m => m.matchType)
      },
      database: {
        totalCertificates: allCertificates.length,
        // certificates: allCertificates.map(cert => ({
        //   id: cert.certificateId,
        //   hashes: {
        //     sha256: cert.sha256Hash,
        //     cid: cert.cidHash,
        //     ipfs: cert.ipfsHash
        //   },
        //   source: cert.source,
        //   createdAt: cert.createdAt
        // }))
      },
      blockchain: {
        status: 'NOT_CHECKED',
        note: 'Use /api/certificates/{id}/verify for blockchain verification'
      },
      _links: {
        verification: `/api/certificates/verify/pdf`,
        debug: `/api/certificates/debug/pdf`,
        blockchain: matches.length > 0 ? `/api/certificates/${matches[0].certificateId}/blockchain` : null
      }
    });
  } catch (error) {
    console.error(`[${debugId}] Debug Error:`, error);
    return res.status(500).json({
      code: 'DEBUG_FAILED',
      message: 'Failed to debug PDF verification',
      debugId,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Certificate Retrieval
export const getCertificatePDF = async (req, res) => {
  const { certificateId } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    // 1. Validate certificate ID format
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      return res.status(400).json({
        code: 'INVALID_ID',
        message: 'Certificate ID must be 64-character hexadecimal string',
        certificateId,
        requestId,
        example: '817759607228da54a922e4160f9d1b8f646e02360fc0f08372063510e87a45d6'
      });
    }

    // 2. Fetch certificate data from blockchain
    const certificateData = await contract.methods.getCertificate(certificateId).call();

    // 3. Extract IPFS hash with multiple fallbacks
    const ipfsHash = (
      certificateData[4] ||                  // Array position
      certificateData.ipfsHash ||            // Named property
      certificateData._ipfs_hash ||          // Alternative naming
      certificateData.ipfs                   // Common abbreviation
    )?.trim();

    // 4. Validate CID existence
    if (!ipfsHash) {
      return res.status(404).json({
        code: 'MISSING_CID',
        message: 'No IPFS hash associated with certificate',
        certificateId,
        requestId,
        resolution: 'Regenerate certificate with valid PDF upload'
      });
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
      return res.status(400).json({
        code: 'INVALID_CID',
        message: 'Malformed IPFS Content Identifier',
        certificateId,
        ipfsHash,
        requestId,
        documentation: 'https://docs.ipfs.tech/concepts/content-addressing/'
      });
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
    // Enhanced error classification
    const errorType = error.message.includes('revert') ? 'BLOCKCHAIN_ERROR' :
      error.message.includes('invalid arrayify') ? 'INVALID_INPUT' :
        'SERVER_ERROR';

    res.status(500).json({
      code: 'PDF_RETRIEVAL_FAILED',
      type: errorType,
      message: 'Failed to retrieve PDF certificate',
      certificateId,
      requestId,
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
};

export const getCertificateMetadata = async (req, res) => {
  const { certificateId } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    if (!/^[a-f0-9]{64}$/i.test(certificateId)) {
      return res.status(400).json({
        code: 'INVALID_ID',
        message: 'Invalid certificate ID format',
        certificateId,
        requestId
      });
    }

    const [exists, blockchainData] = await Promise.all([
      contract.methods.isVerified(certificateId).call(),
      contract.methods.getCertificate(certificateId).call()
    ]);

    if (!exists) {
      return res.status(404).json({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate does not exist or is revoked',
        certificateId,
        requestId
      });
    }

    const parsedData = parseCertificateData(blockchainData);

    res.json({
      status: 'FOUND',
      certificateId,
      ...parsedData,
      timestamp: Number(parsedData.timestamp),
      verificationStatus: 'VALID',
      links: {
        pdf: `${PINATA_GATEWAY_BASE_URL}/${parsedData.ipfsHash}`,
        blockchain: `${BLOCK_EXPLORER_URL}/tx/${certificateId}`
      }
    });

  } catch (error) {
    res.status(500).json({
      code: 'METADATA_ERROR',
      message: 'Failed to fetch certificate metadata',
      certificateId,
      requestId,
      details: error.message
    });
  }
};

export const searchByCID = async (req, res) => {
  const { cid } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    // Try to find the certificate by any hash format
    const certificate = await findCertificateByAnyHash(cid);

    if (!certificate) {
      return res.status(404).json({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'No certificate found with this identifier',
        searchValue: cid,
        requestId,
        tip: 'Try searching with the IPFS hash (starts with Qm) or the certificate ID'
      });
    }

    // Verify on blockchain
    try {
      const isValid = await contract.methods.isVerified(certificate.certificateId).call();
    } catch (blockchainError) {
      const { statusCode, error } = blockchainErrorHandler(blockchainError, certificate.certificateId);
      return res.status(statusCode).json({
        error,
        searchValue: cid,
        requestId
      });
    }

    // Return formatted response
    res.json(formatCertificateResponse(certificate));

  } catch (error) {
    console.error(`[${requestId}] Search Error:`, error);
    res.status(500).json({
      code: 'SEARCH_ERROR',
      message: 'Failed to search for certificate',
      searchValue: cid,
      requestId,
      details: error.message
    });
  }
};

// Certificate Management
export const getCertificateStats = async (req, res) => {
  try {
    if (statsCache.has('latest')) {
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
    statsCache.set('latest', {
      timestamp: Date.now(),
      data: result
    });

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
  const { orgName } = req.params;
  const page = parseInt(req.query.page) || 1;
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