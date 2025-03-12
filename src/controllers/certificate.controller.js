// src/controllers/certificateController.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import pdfUtils from '../utils/pdfUtils.js';
import * as pinata from '../utils/pinata.js';
import { contract, web3 } from '../utils/blockchain.js';
import { PINATA_GATEWAY_BASE_URL } from '../constants.js';
import Certificate from '../models/certificate.model.js'; // Optional local storage

/**
 * Generates a certificate:
 * 1. Creates a PDF certificate.
 * 2. Uploads PDF to Pinata.
 * 3. Computes certificate ID.
 * 4. Records certificate on the blockchain.
 * 5. Optionally stores a local record.
 */
export const generateCertificate = async (req, res) => {
  try {
    const { uid, candidateName, courseName, orgName } = req.body;
    if (!uid || !candidateName || !courseName || !orgName) {
      return res.status(400).json({ error: 'Missing required certificate details' });
    }

    // Define PDF output path and institute logo path
    const outputDir = path.resolve('uploads');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const pdfFilePath = path.join(outputDir, `certificate_${Date.now()}.pdf`);
    const instituteLogoPath = path.resolve('public/assets/logo.jpg');

    // Generate certificate PDF
    await pdfUtils.generateCertificate(pdfFilePath, uid, candidateName, courseName, orgName, instituteLogoPath);

    // Upload PDF to Pinata
    const ipfsHash = await pinata.uploadToPinata(pdfFilePath);
    fs.unlinkSync(pdfFilePath); // Remove the file

    if (!ipfsHash) {
      return res.status(500).json({ error: 'Failed to upload certificate to Pinata' });
    }

    // Compute certificate ID (SHA256)
    const dataToHash = `${uid}${candidateName}${courseName}${orgName}`;
    const certificateId = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // Interact with blockchain smart contract
    const accounts = await web3.eth.getAccounts();
    const tx = await contract.methods
      .generateCertificate(certificateId, uid, candidateName, courseName, orgName, ipfsHash)
      .send({
        from: accounts[0],
        gas: 500000,
        gasPrice: web3.utils.toWei('20', 'gwei')
      });

    // Optionally store certificate record in MongoDB
    const certificateRecord = new Certificate({ certificateId, uid, candidateName, courseName, orgName, ipfsHash });
    await certificateRecord.save();

    // Build transaction details, converting any BigInt values to string
    const txDetails = {
      transactionHash: tx.transactionHash,
      gasUsed: tx.gasUsed ? tx.gasUsed.toString() : undefined,
      blockNumber: tx.blockNumber ? tx.blockNumber.toString() : undefined,
      from: accounts[0]
    };

    // Respond with detailed certificate information
    res.status(200).json({
      message: 'Certificate generated successfully',
      certificate: {
        certificateId,
        uid,
        candidateName,
        courseName,
        orgName,
        ipfsHash
      },
      transaction: txDetails
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Certificate generation failed', details: error.toString() });
  }
};

/**
 * Verifies a certificate via a PDF upload.
 */
export const verifyCertificatePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = req.file.path;
    const { uid, candidateName, courseName, orgName } = await pdfUtils.extractCertificate(filePath);
    fs.unlinkSync(filePath); // Remove temp file

    const dataToHash = `${uid}${candidateName}${courseName}${orgName}`;
    const certificateId = crypto.createHash('sha256').update(dataToHash).digest('hex');

    const isVerified = await contract.methods.isVerified(certificateId).call();
    if (isVerified) {
      return res.status(200).json({
        message: 'Certificate validated successfully',
        certificate: { certificateId, uid, candidateName, courseName, orgName }
      });
    } else {
      return res.status(400).json({ error: 'Invalid or tampered certificate' });
    }
  } catch (error) {
    console.error('Error verifying certificate by PDF:', error);
    res.status(500).json({ error: 'Certificate verification failed', details: error.toString() });
  }
};

/**
 * Verifies a certificate using its certificate ID.
 */
export const verifyCertificateById = async (req, res) => {
  try {
    const certificateId = req.params.certificateId;

    // First, check if the certificate exists on-chain.
    const exists = await contract.methods.isVerified(certificateId).call();
    if (!exists) {
      return res.status(404).json({ error: "Certificate not found on blockchain" });
    }

    // Then, call getCertificate.
    const result = await contract.methods.getCertificate(certificateId).call();
    const ipfsHash = result[4];

    if (!ipfsHash) {
      return res.status(404).json({ error: "Certificate not found on blockchain" });
    }

    const contentUrl = `${PINATA_GATEWAY_BASE_URL}/${ipfsHash}`;
    const response = await axios.get(contentUrl, { responseType: 'arraybuffer' });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="certificate.pdf"'
    });
    return res.send(response.data);
  } catch (error) {
    console.error('Error verifying certificate by ID:', error);
    res.status(500).json({ error: 'Certificate retrieval failed', details: error.toString() });
  }
};

