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
      return res.status(400).json({ error: 'No PDF file uploaded. Expected field name: "file"' });
    }

    const filePath = req.file.path;
    let pdfData;

    try {
      pdfData = await extractCertificate(filePath);
      console.log('Extracted PDF data:', pdfData);
    } catch (extractError) {
      console.error('PDF extraction error:', extractError.message);
      return res.status(400).json({
        error: 'Failed to extract certificate data from PDF',
        details: extractError.message
      });
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Temporary file deleted:', filePath);
      }
    }

    const { uid, candidateName, courseName, orgName } = pdfData || {};
    const missingFields = [];
    if (!uid) missingFields.push('uid');
    if (!candidateName) missingFields.push('candidateName');
    if (!courseName) missingFields.push('courseName');
    if (!orgName) missingFields.push('orgName');

    if (missingFields.length > 0) {
      console.log('Missing fields in extracted data:', missingFields);
      return res.status(400).json({
        error: 'PDF missing required fields',
        missing: missingFields,
        extractedData: pdfData
      });
    }

    const certificateId = generateCertificateHash(uid, candidateName, courseName, orgName);
    console.log('Generated certificateId:', certificateId);

    const exists = await contract.methods.isVerified(certificateId).call();
    if (!exists) {
      console.log('Certificate not found on blockchain for ID:', certificateId);
      return res.status(404).json({
        error: 'Certificate not found on blockchain',
        certificateId
      });
    }

    const certificateData = await contract.methods.getCertificate(certificateId).call();
    console.log('Raw blockchain data:', certificateData);

    let onChainUid, onChainCandidateName, onChainCourseName, onChainOrgName, onChainIpfsHash, onChainTimestamp;
    if (Array.isArray(certificateData)) {
      [onChainUid, onChainCandidateName, onChainCourseName, onChainOrgName, onChainIpfsHash, onChainTimestamp] = certificateData;
    } else if (certificateData && typeof certificateData === 'object') {
      onChainUid = certificateData.uid;
      onChainCandidateName = certificateData.candidateName;
      onChainCourseName = certificateData.courseName;
      onChainOrgName = certificateData.orgName;
      onChainIpfsHash = certificateData.ipfsHash;
      onChainTimestamp = certificateData.timestamp;
    } else {
      throw new Error('Unexpected blockchain data format');
    }

    // Validate blockchain data
    const missingOnChainFields = [];
    if (onChainUid === undefined) missingOnChainFields.push('uid');
    if (onChainCandidateName === undefined) missingOnChainFields.push('candidateName');
    if (onChainCourseName === undefined) missingOnChainFields.push('courseName');
    if (onChainOrgName === undefined) missingOnChainFields.push('orgName');
    if (onChainIpfsHash === undefined) missingOnChainFields.push('ipfsHash');
    if (onChainTimestamp === undefined) missingOnChainFields.push('timestamp');

    if (missingOnChainFields.length > 0) {
      console.log('Missing fields in blockchain data:', missingOnChainFields);
      return res.status(500).json({
        error: 'Incomplete blockchain data',
        details: `Missing fields: ${missingOnChainFields.join(', ')}`,
        certificateId
      });
    }

    // Data consistency check with nullish coalescing
    const isConsistent = (
      (onChainUid || '').trim() === (uid || '').trim() &&
      (onChainCandidateName || '').trim().toLowerCase() === (candidateName || '').trim().toLowerCase() &&
      (onChainCourseName || '').trim().toLowerCase() === (courseName || '').trim().toLowerCase() &&
      (onChainOrgName || '').trim().toLowerCase() === (orgName || '').trim().toLowerCase()
    );

    if (!isConsistent) {
      console.log('Data mismatch:', {
        pdf: { uid, candidateName, courseName, orgName },
        blockchain: { onChainUid, onChainCandidateName, onChainCourseName, onChainOrgName }
      });
      return res.status(409).json({
        error: 'Data mismatch',
        details: 'PDF content does not match blockchain records',
        certificateId,
        pdfData: { uid, candidateName, courseName, orgName },
        blockchainData: {
          uid: onChainUid,
          candidateName: onChainCandidateName,
          courseName: onChainCourseName,
          orgName: onChainOrgName
        }
      });
    }

    res.status(200).json({
      message: 'Certificate verified successfully',
      certificate: {
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash: onChainIpfsHash,
        timestamp: Number(onChainTimestamp)
      },
      verification: {
        blockchainConfirmed: true,
        dataConsistent: true
      }
    });

  } catch (error) {
    console.error('Verification by PDF Error:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        console.log('Multer unexpected field:', error.field);
        return res.status(400).json({
          error: 'Unexpected field in upload',
          details: `Expected field name "file", got "${error.field || 'unknown'}"`
        });
      }
      return res.status(400).json({
        error: 'File upload error',
        details: error.message
      });
    }

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
    if (!/^[a-fA-F0-9]{64}$/.test(certificateId)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: 'Certificate ID must be a 64-character hexadecimal string'
      });
    }

    // 2. Check blockchain existence
    console.log('Checking certificate existence for ID:', certificateId);
    const exists = await contract.methods.isVerified(certificateId).call();
    if (!exists) {
      console.log('Certificate not found on blockchain');
      return res.status(404).json({
        error: 'Certificate not found',
        certificateId
      });
    }

    // 3. Get certificate data
    const certificateData = await contract.methods.getCertificate(certificateId).call();
    console.log('Raw certificate data from blockchain:', certificateData);

    // Handle array or object response
    let uid, candidateName, courseName, orgName, ipfsHash, timestamp;
    if (Array.isArray(certificateData)) {
      // web3.js 1.x array response
      [uid, candidateName, courseName, orgName, ipfsHash, timestamp] = certificateData;
    } else if (certificateData && typeof certificateData === 'object') {
      // Named returns or object response
      uid = certificateData.uid || certificateData[0];
      candidateName = certificateData.candidateName || certificateData[1];
      courseName = certificateData.courseName || certificateData[2];
      orgName = certificateData.orgName || certificateData[3];
      ipfsHash = certificateData.ipfsHash || certificateData[4];
      timestamp = certificateData.timestamp || certificateData[5];
    } else {
      throw new Error('Unexpected certificate data format');
    }

    console.log('Parsed certificate data:', { uid, candidateName, courseName, orgName, ipfsHash, timestamp });

    // 4. Validate IPFS hash
    if (!ipfsHash || !ipfsHash.startsWith('Qm')) {
      console.error('Invalid IPFS hash:', ipfsHash);
      return res.status(500).json({
        error: 'Invalid IPFS data',
        details: 'Corrupted certificate storage'
      });
    }

    // 5. Retrieve PDF from IPFS
    const ipfsUrl = `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`;
    console.log('Fetching IPFS content from:', ipfsUrl);
    const response = await axios.get(ipfsUrl, { responseType: 'arraybuffer' });

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
    }).send(response.data);

  } catch (error) {
    console.error('Verification by ID Error:', error);
    const statusCode = error.response?.status === 504 ? 502 : 500;
    const errorMessage = error.message.includes('IPFS')
      ? 'IPFS gateway error'
      : 'Verification failed';

    res.status(statusCode).json({
      error: errorMessage,
      certificateId: req.params.certificateId,
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};