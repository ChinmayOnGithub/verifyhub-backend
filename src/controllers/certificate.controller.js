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

BigInt.prototype.toJSON = function () { return this.toString(); };
const BLOCK_EXPLORER_URL = 'something'

// Helper function for standardized hashing
const generateCertificateHash = (uid, candidateName, courseName, orgName) => {
  const normalizedData = `${uid}|${candidateName.trim().toLowerCase()}|${courseName.trim().toLowerCase()}|${orgName.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalizedData).digest('hex');
};

// generate certificate (Most imp function)
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
    // 5. IPFS Upload
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
    // 6. Blockchain Transaction (Updated)
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
      console.error(`[${generationId}] Blockchain error:`, blockchainError);
      return res.status(502).json({
        error: {
          code: 'BLOCKCHAIN_REJECTED',
          message: 'Blockchain transaction failed',
          reason: blockchainError.data?.message || blockchainError.message,
          isRecoverable: false,
          actionRequired: 'Contact support with generation ID'
        },
        meta: {
          ...certificateData,
          ipfsHash,
          blockchainAttempted: true
        }
      });
    }

    // ======================
    // 7. Database Sync
    // ======================
    try {
      await Certificate.create({
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash,
        blockchainTx: txReceipt.transactionHash,
        generationMetadata: {
          id: generationId,
          durationMs: Date.now() - startTime,
          nodeVersion: process.version
        }
      });
    } catch (dbError) {
      console.error(`[${generationId}] Database sync failed:`, dbError);
      // Non-critical error, continue but notify
    }
    // ======================
    // 8. Final Response (Updated)
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


// Utility function for common error responses
const blockchainErrorHandler = (error, certificateId) => {
  console.error(`[${certificateId}] Verification Error:`, error);

  const isRevert = error.data?.startsWith('0x08c379a0'); // Error selector for revert
  const statusCode = isRevert ? 404 : 500;
  const errorCodes = {
    'Certificate not found': 'NOT_FOUND',
    'Already revoked': 'REVOKED',
    default: 'VERIFICATION_ERROR'
  };

  return {
    statusCode,
    error: {
      code: errorCodes[error.reason] || errorCodes.default,
      message: isRevert ? 'Blockchain operation reverted' : 'Verification failed',
      details: error.reason || error.message
    }
  };
};

// ======================
// verifyCertificate (Fixed)
// ======================
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
    [isValid, certificateData] = await Promise.all([
      contract.methods.isVerified(certificateId).call(),
      contract.methods.getCertificate(certificateId).call()
    ]);

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

// ======================
// getCertificatePDF (Fixed)
// ======================
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
// -----------------------------------------------------------------------------------------




// Helper: Standardize blockchain response parsing
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

// Updated verifyCertificatePdf function
export const verifyCertificatePdf = async (req, res) => {
  const verificationId = crypto.randomBytes(4).toString('hex');

  try {
    // 1. Validate file upload
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'No PDF file uploaded',
        verificationId
      });
    }

    // 2. Compute PDF hash
    const computedHash = computePDFHash(req.file.buffer);

    // 3. Get stored hash from blockchain
    const storedHash = await getStoredHashFromBlockchain(computedHash); // Using hash as lookup key

    // 4. Compare hashes
    if (computedHash !== storedHash) {
      return res.status(400).json({
        code: 'HASH_MISMATCH',
        message: 'PDF content does not match blockchain record',
        verificationId,
        computedHash,
        storedHash
      });
    }

    // 5. Get full certificate details
    const certificate = await Certificate.findOne({ ipfsHash: storedHash });
    if (!certificate) {
      return res.status(404).json({
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Hash verified but certificate record missing',
        verificationId
      });
    }

    // 6. Successful verification response
    res.json({
      status: 'VALID',
      verificationId,
      certificate: {
        ...certificate.toObject(),
        pdfUrl: `${PINATA_GATEWAY_BASE_URL}/${certificate.ipfsHash}`
      },
      verification: {
        method: 'PDF_HASH_VERIFICATION',
        blockchainConfirmed: true
      }
    });

  } catch (error) {
    console.error(`[${verificationId}] Verification Error:`, error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      code: 'VERIFICATION_FAILED',
      message: error.message,
      verificationId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};


// export const verifyCertificate = async (req, res) => {
//   try {
//     const { verificationId } = req.body;
//     const pdfFile = req.file;

//     // 1. Validate input
//     if (!pdfFile || !pdfFile.buffer) {
//       return res.status(400).json({
//         code: 'VALIDATION_ERROR',
//         message: 'PDF file required for verification'
//       });
//     }

//     // 2. Compute PDF hash
//     const computedHash = computePDFHash(pdfFile.buffer);

//     // 3. Get blockchain-stored hash
//     const storedHash = await getStoredHashFromBlockchain(verificationId);

//     // 4. Compare hashes
//     if (computedHash !== storedHash) {
//       return res.status(400).json({
//         code: 'HASH_MISMATCH',
//         message: 'PDF content does not match blockchain record',
//         verificationId,
//         computedHash,
//         storedHash
//       });
//     }

//     // 5. Return successful verification
//     res.json({
//       code: 'VERIFIED',
//       message: 'Certificate authenticity confirmed',
//       verificationId,
//       blockHash: storedHash
//     });

//   } catch (error) {
//     res.status(500).json({
//       code: 'VERIFICATION_ERROR',
//       message: error.message,
//       verificationId: req.body.verificationId,
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// };




// Enhanced Metadata Endpoint
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

// Secure External Certificate Upload
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

    const processFile = async (path) => {
      const pdfBuffer = fs.readFileSync(path);
      return {
        pdfHash: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        ipfsHash: await pinata.uploadToPinata(path)
      };
    };

    const { pdfHash, ipfsHash } = await processFile(req.file.path);
    fs.unlinkSync(req.file.path);

    // Validate CID before blockchain storage
    CID.parse(ipfsHash.trim());

    const accounts = await web3.eth.getAccounts();
    const tx = await contract.methods
      .storeExternalCertificate(pdfHash, ipfsHash)
      .send({ from: accounts[0], gas: 1000000 });

    await new Certificate({
      cid: ipfsHash,
      pdfHash,
      orgName: req.body.orgName,
      candidateName: req.body.candidateName,
      txHash: tx.transactionHash
    }).save();

    res.status(201).json({
      status: 'UPLOADED',
      cid: ipfsHash,
      verificationUrl: `/api/certificates/verify/${ipfsHash}`,
      ipfsGateway: `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`,
      transaction: {
        hash: tx.transactionHash,
        block: tx.blockNumber
      }
    });

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

// CID Search with Validation
export const searchByCID = async (req, res) => {
  const { cid } = req.params;
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    CID.parse(cid); // Validate CID format first

    const exists = await contract.methods.cidExists(cid).call();
    if (!exists) {
      return res.status(404).json({
        code: 'CID_NOT_FOUND',
        message: 'Certificate with this CID does not exist',
        cid,
        requestId
      });
    }

    res.redirect(301, `${PINATA_GATEWAY_BASE_URL}/${cid}`);

  } catch (error) {
    const statusCode = error.message.includes('invalid cid') ? 400 : 500;
    res.status(statusCode).json({
      code: statusCode === 400 ? 'INVALID_CID' : 'SEARCH_ERROR',
      message: 'CID search failed',
      cid,
      requestId,
      details: error.message
    });
  }
};

// Statistics Endpoint with Cache
const statsCache = new Map();
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

// Organization Certificates with Pagination
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