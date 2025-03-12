// // src/controllers/certificateController.js
// import fs from 'fs';
// import path from 'path';
// import crypto from 'crypto';
// import axios from 'axios';
// import { generateCertificatePdf } from '../utils/pdfUtils.js';
// import * as pinata from '../utils/pinata.js';
// import { contract, web3 } from '../utils/blockchain.js';
// import { PINATA_GATEWAY_BASE_URL } from '../constants.js';
// import Certificate from '../models/certificate.model.js';
// import { extractCertificate } from '../utils/pdfReaderUtils.js';


// const validateCertificateData = (data) => {
//   if (!Array.isArray(data) || data.length < 5) {
//     throw new Error('Invalid certificate data structure');
//   }
//   return data;
// };

// // Helper function for standardized hashing
// const generateCertificateHash = (uid, candidateName, courseName, orgName) => {
//   const cleanData = [
//     uid.trim(),
//     candidateName.trim().toLowerCase(),
//     courseName.trim().toLowerCase(),
//     orgName.trim().toLowerCase()
//   ].join('|');
//   return crypto.createHash('sha256').update(cleanData).digest('hex');
// };

// export const generateCertificate = async (req, res) => {
//   try {
//     const { uid, candidateName, courseName, orgName } = req.body;

//     // Validate input
//     const missingFields = [];
//     if (!uid) missingFields.push('uid');
//     if (!candidateName) missingFields.push('candidateName');
//     if (!courseName) missingFields.push('courseName');
//     if (!orgName) missingFields.push('orgName');
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         error: 'Missing required fields',
//         missing: missingFields
//       });
//     }

//     // Generate PDF
//     const outputDir = path.resolve('uploads');
//     if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
//     const pdfFilePath = path.join(outputDir, `certificate_${Date.now()}.pdf`);
//     const instituteLogoPath = path.resolve('public/assets/logo.jpg');

//     await generateCertificatePdf(
//       pdfFilePath,
//       uid,
//       candidateName,
//       courseName,
//       orgName,
//       fs.existsSync(instituteLogoPath) ? instituteLogoPath : null
//     );

//     // Upload to IPFS via Pinata
//     const ipfsHash = await pinata.uploadToPinata(pdfFilePath);
//     fs.unlinkSync(pdfFilePath); // Cleanup

//     if (!ipfsHash) {
//       return res.status(500).json({ error: 'IPFS upload failed' });
//     }

//     // Generate certificate ID
//     const certificateId = generateCertificateHash(uid, candidateName, courseName, orgName);

//     // Blockchain interaction: store certificate on-chain
//     const accounts = await web3.eth.getAccounts();
//     const tx = await contract.methods
//       .generateCertificate(
//         certificateId,
//         uid,
//         candidateName,
//         courseName,
//         orgName,
//         ipfsHash
//       )
//       .send({
//         from: accounts[0],
//         gas: 500000,
//         gasPrice: web3.utils.toWei('20', 'gwei')
//       });

//     // Optional: Save certificate record in MongoDB
//     try {
//       const certRecord = new Certificate({
//         certificateId,
//         uid,
//         candidateName,
//         courseName,
//         orgName,
//         ipfsHash
//       });
//       await certRecord.save();
//     } catch (dbError) {
//       console.error('Database save failed:', dbError);
//       // Continue since blockchain is source of truth
//     }

//     // Prepare response
//     const response = {
//       message: 'Certificate generated successfully',
//       certificate: {
//         certificateId,
//         uid,
//         candidateName,
//         courseName,
//         orgName,
//         ipfsHash
//       },
//       transaction: {
//         transactionHash: tx.transactionHash,
//         blockNumber: tx.blockNumber?.toString(),
//         gasUsed: tx.gasUsed?.toString(),
//         from: accounts[0]
//       }
//     };

//     res.status(201).json(response);
//   } catch (error) {
//     console.error('Generation Error:', error);
//     res.status(500).json({
//       error: 'Certificate generation failed',
//       details: error.message,
//       ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
//     });
//   }
// };

// // PDF Verification
// export const verifyCertificatePdf = async (req, res) => {
//   try {
//     const { path: filePath } = req.file || {};
//     if (!filePath) return res.status(400).json({ error: 'No PDF uploaded' });

//     try {
//       const pdfData = await extractCertificate(filePath);
//       const { uid, candidateName, courseName, orgName } = pdfData;
//       const certificateId = generateCertificateHash(uid, candidateName, courseName, orgName);

//       const exists = await contract.methods.isVerified(certificateId).call();
//       if (!exists) return res.status(404).json({ error: 'Certificate not found' });

//       const response = await contract.methods.getCertificate(certificateId).call();

//       // Convert to array if needed (web3@1.x vs web3@4.x compatibility)
//       const certificateData = Array.isArray(response) ? response : Object.values(response);

//       const [
//         chainUID,
//         chainCandidateName,
//         chainCourseName,
//         chainOrgName,
//         chainIPFS
//       ] = certificateData;

//       if (
//         chainUID !== uid ||
//         chainCandidateName !== candidateName ||
//         chainCourseName !== courseName ||
//         chainOrgName !== orgName
//       ) {
//         return res.status(409).json({
//           error: 'Data mismatch',
//           certificateId,
//           pdfData: { uid, candidateName, courseName, orgName },
//           chainData: { chainUID, chainCandidateName, chainCourseName, chainOrgName }
//         });
//       }

//       return res.status(200).json({
//         message: 'Verification successful',
//         certificate: {
//           certificateId,
//           uid,
//           candidateName,
//           courseName,
//           orgName,
//           ipfsHash: chainIPFS
//         }
//       });

//     } finally {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     }

//   } catch (error) {
//     console.error('Verification error:', error);
//     return res.status(500).json({
//       error: 'Verification failed',
//       details: error.message
//     });
//   }
// };

// // ID Verification
// export const verifyCertificateById = async (req, res) => {
//   try {
//     const { certificateId } = req.params;

//     if (!/^[a-f0-9]{64}$/.test(certificateId)) {
//       return res.status(400).json({ error: 'Invalid certificate ID' });
//     }

//     const exists = await contract.methods.isVerified(certificateId).call();
//     if (!exists) return res.status(404).json({ error: 'Certificate not found' });

//     const response = await contract.methods.getCertificate(certificateId).call();
//     const certificateData = Array.isArray(response) ? response : Object.values(response);

//     const ipfsHash = certificateData[4]; // Direct array access

//     if (!ipfsHash?.startsWith('Qm')) {
//       return res.status(500).json({ error: 'Invalid IPFS hash format' });
//     }

//     const pdfResponse = await axios.get(`${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`, {
//       responseType: 'arraybuffer',
//       timeout: 10000
//     });

//     return res
//       .set({
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `inline; filename="certificate_${certificateId}.pdf"`
//       })
//       .send(pdfResponse.data);

//   } catch (error) {
//     console.error('ID verification error:', error);
//     return res.status(500).json({
//       error: 'Verification failed',
//       details: error.message
//     });
//   }
// };




// src/controllers/certificateController.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { generateCertificatePdf } from '../utils/pdfUtils.js';
import * as pinata from '../utils/pinata.js';
import { contract, web3 } from '../utils/blockchain.js';
import { PINATA_GATEWAY_BASE_URL } from '../constants.js';
import Certificate from '../models/certificate.model.js';
import { extractCertificate } from '../utils/pdfReaderUtils.js';

// Helper function for standardized hashing
const generateCertificateHash = (uid, candidateName, courseName, orgName) => {
  const normalizedData = `${uid}|${candidateName.trim().toLowerCase()}|${courseName.trim().toLowerCase()}|${orgName.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalizedData).digest('hex');
};

export const generateCertificate = async (req, res) => {
  try {
    const { uid, candidateName, courseName, orgName } = req.body;

    // Validate input
    const missingFields = [];
    if (!uid) missingFields.push('uid');
    if (!candidateName) missingFields.push('candidateName');
    if (!courseName) missingFields.push('courseName');
    if (!orgName) missingFields.push('orgName');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }

    // Generate PDF
    const outputDir = path.resolve('uploads');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const pdfFilePath = path.join(outputDir, `certificate_${Date.now()}.pdf`);
    const instituteLogoPath = path.resolve('public/assets/logo.jpg');

    await generateCertificatePdf(
      pdfFilePath,
      uid,
      candidateName,
      courseName,
      orgName,
      fs.existsSync(instituteLogoPath) ? instituteLogoPath : null
    );

    // Upload to IPFS
    const ipfsHash = await pinata.uploadToPinata(pdfFilePath);
    fs.unlinkSync(pdfFilePath); // Cleanup

    if (!ipfsHash) {
      return res.status(500).json({ error: 'IPFS upload failed' });
    }

    // Generate certificate ID
    const certificateId = generateCertificateHash(uid, candidateName, courseName, orgName);

    // Blockchain interaction
    const accounts = await web3.eth.getAccounts();
    const tx = await contract.methods
      .generateCertificate(
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash
      )
      .send({
        from: accounts[0],
        gas: 500000,
        gasPrice: web3.utils.toWei('20', 'gwei')
      });

    // Optional MongoDB storage
    try {
      const certRecord = new Certificate({
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash
      });
      await certRecord.save();
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      // Continue since blockchain is source of truth
    }

    // Prepare response
    const response = {
      message: 'Certificate generated successfully',
      certificate: {
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash
      },
      transaction: {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber?.toString(),
        gasUsed: tx.gasUsed?.toString(),
        from: accounts[0]
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Generation Error:', error);
    res.status(500).json({
      error: 'Certificate generation failed',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

export const verifyCertificatePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    let pdfData;

    try {
      pdfData = await extractCertificate(filePath);
    } catch (extractError) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Invalid PDF format',
        details: extractError.message
      });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Validate extracted data
    const { uid, candidateName, courseName, orgName } = pdfData;
    const missingFields = [];
    if (!uid) missingFields.push('uid');
    if (!candidateName) missingFields.push('candidateName');
    if (!courseName) missingFields.push('courseName');
    if (!orgName) missingFields.push('orgName');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'PDF missing required fields',
        missing: missingFields
      });
    }

    // Generate certificate ID
    const certificateId = generateCertificateHash(uid, candidateName, courseName, orgName);

    // Blockchain verification
    let onChainData;
    try {
      const exists = await contract.methods.isVerified(certificateId).call();
      if (!exists) {
        return res.status(404).json({
          error: 'Certificate not found',
          certificateId
        });
      }

      onChainData = await contract.methods.getCertificate(certificateId).call();
    } catch (blockchainError) {
      console.error('Blockchain Error:', blockchainError);
      return res.status(503).json({
        error: 'Blockchain service unavailable',
        details: 'Could not verify certificate status'
      });
    }

    // Data consistency check
    const isConsistent = (
      onChainData.uid === uid &&
      onChainData.candidate_name.toLowerCase() === candidateName.toLowerCase() &&
      onChainData.course_name.toLowerCase() === courseName.toLowerCase() &&
      onChainData.org_name.toLowerCase() === orgName.toLowerCase()
    );

    if (!isConsistent) {
      return res.status(409).json({
        error: 'Data mismatch',
        details: 'PDF content does not match blockchain records',
        certificateId,
        pdfData: { uid, candidateName, courseName, orgName },
        blockchainData: {
          uid: onChainData.uid,
          candidateName: onChainData.candidate_name,
          courseName: onChainData.course_name,
          orgName: onChainData.org_name
        }
      });
    }

    // Success response
    res.status(200).json({
      message: 'Certificate verified successfully',
      certificate: {
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash: onChainData.ipfs_hash
      },
      verification: {
        blockchainConfirmed: true,
        dataConsistent: true
      }
    });

  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({
      error: 'Verification process failed',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

export const verifyCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;

    // 1. Validate ID format
    if (!/^[a-zA-Z0-9-]{64}$/.test(certificateId)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: 'Certificate ID must be 64-character alphanumeric string'
      });
    }

    // 2. Check blockchain existence
    const exists = await contract.methods.isVerified(certificateId).call();
    if (!exists) {
      return res.status(404).json({
        error: 'Certificate not found',
        certificateId
      });
    }

    // 3. Get certificate data
    const [
      uid,
      candidateName,
      courseName,
      orgName,
      ipfsHash,
      timestamp
    ] = await contract.methods.getCertificate(certificateId).call();

    // 4. Validate IPFS hash
    if (!ipfsHash?.startsWith('Qm')) {
      return res.status(500).json({
        error: 'Invalid IPFS data',
        details: 'Corrupted certificate storage'
      });
    }

    // 5. Retrieve PDF from IPFS
    const pdfData = await pinata.retrieveFromIPFS(ipfsHash);

    // 6. Send response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${certificateId}.pdf"`,
      'X-Certificate-Metadata': JSON.stringify({
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        timestamp
      })
    }).send(pdfData);

  } catch (error) {
    console.error('Verification Error:', error);

    const statusCode = error.message.includes('IPFS') ? 502 : 500;
    const errorMessage = error.message.includes('gateways')
      ? 'Temporary IPFS service outage'
      : 'Verification failed';

    res.status(statusCode).json({
      error: errorMessage,
      certificateId: req.params.certificateId,
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};
// export const verifyCertificateById = async (req, res) => {
//   try {
//     const { certificateId } = req.params;

//     // Basic ID validation
//     if (!certificateId || !/^[a-f0-9]{64}$/.test(certificateId)) {
//       return res.status(400).json({ error: 'Invalid certificate ID format' });
//     }

//     // Blockchain check
//     let onChainData;
//     try {
//       const exists = await contract.methods.isVerified(certificateId).call();
//       if (!exists) {
//         return res.status(404).json({ error: 'Certificate not found' });
//       }

//       onChainData = await contract.methods.getCertificate(certificateId).call();
//     } catch (blockchainError) {
//       console.error('Blockchain Error:', blockchainError);
//       return res.status(503).json({
//         error: 'Blockchain service unavailable',
//         details: 'Could not retrieve certificate'
//       });
//     }

//     // Fetch PDF from IPFS
//     try {
//       const contentUrl = `${PINATA_GATEWAY_BASE_URL}/${onChainData.ipfs_hash}`;
//       const response = await axios.get(contentUrl, {
//         responseType: 'arraybuffer',
//         timeout: 10000
//       });

//       res.set({
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `inline; filename="certificate_${certificateId}.pdf"`
//       });

//       return res.send(response.data);
//     } catch (ipfsError) {
//       console.error('IPFS Retrieval Error:', ipfsError);
//       return res.status(502).json({
//         error: 'Could not retrieve certificate file',
//         details: 'IPFS service unavailable'
//       });
//     }

//   } catch (error) {
//     console.error('ID Verification Error:', error);
//     res.status(500).json({
//       error: 'Certificate verification failed',
//       details: error.message,
//       ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
//     });
//   }
// };