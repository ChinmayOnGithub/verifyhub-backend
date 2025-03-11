// src/controllers/certificateController.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const pdfUtils = require('../utils/pdfUtils');
const pinata = require('../utils/pinata');
const { contract, web3 } = require('../utils/blockchain');
const { PINATA_GATEWAY_BASE_URL } = require('../constants');
const Certificate = require('../models/Certificate'); // Optional local storage

/**
 * Generates a certificate:
 * 1. Generates a PDF certificate.
 * 2. Uploads the PDF to Pinata and retrieves an IPFS hash.
 * 3. Computes a certificate ID (SHA256 hash of uid, candidateName, courseName, orgName).
 * 4. Calls the smart contract to store the certificate.
 * 5. Optionally stores the certificate record in MongoDB.
 */
exports.generateCertificate = async (req, res) => {
  try {
    const { uid, candidateName, courseName, orgName } = req.body;
    if (!uid || !candidateName || !courseName || !orgName) {
      return res.status(400).json({ error: 'Missing required certificate details' });
    }

    // Define PDF output path and use a default logo from public/assets
    const pdfFilePath = path.join(__dirname, '../../uploads', `certificate_${Date.now()}.pdf`);
    const instituteLogoPath = path.join(__dirname, '../../public/assets/logo.jpg');

    // Generate certificate PDF
    await pdfUtils.generateCertificate(pdfFilePath, uid, candidateName, courseName, orgName, instituteLogoPath);

    // Upload PDF to Pinata
    const ipfsHash = await pinata.uploadToPinata(pdfFilePath);
    fs.unlinkSync(pdfFilePath); // Remove the generated PDF file

    if (!ipfsHash) {
      return res.status(500).json({ error: 'Failed to upload certificate to Pinata' });
    }

    // Compute certificate ID using SHA256 hash
    const dataToHash = `${uid}${candidateName}${courseName}${orgName}`;
    const certificateId = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // Call blockchain smart contract to record the certificate
    const accounts = await web3.eth.getAccounts();
    await contract.methods.generateCertificate(certificateId, uid, candidateName, courseName, orgName, ipfsHash)
      .send({ from: accounts[0] });

    // Optionally store certificate record in MongoDB
    const certificateRecord = new Certificate({ certificateId, uid, candidateName, courseName, orgName, ipfsHash });
    await certificateRecord.save();

    res.status(200).json({ message: 'Certificate generated successfully', certificateId });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Certificate generation failed' });
  }
};

/**
 * Verifies a certificate via a PDF upload.
 * Extracts certificate details from the PDF, computes the certificate ID,
 * and checks on the blockchain if the certificate exists.
 */
exports.verifyCertificatePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = req.file.path;
    const { uid, candidateName, courseName, orgName } = await pdfUtils.extractCertificate(filePath);
    fs.unlinkSync(filePath); // Remove temporary file

    const dataToHash = `${uid}${candidateName}${courseName}${orgName}`;
    const certificateId = crypto.createHash('sha256').update(dataToHash).digest('hex');

    const isVerified = await contract.methods.isVerified(certificateId).call();
    if (isVerified) {
      return res.status(200).json({ message: 'Certificate validated successfully', certificateId });
    } else {
      return res.status(400).json({ error: 'Invalid or tampered certificate' });
    }
  } catch (error) {
    console.error('Error verifying certificate by PDF:', error);
    res.status(500).json({ error: 'Certificate verification failed' });
  }
};

/**
 * Verifies a certificate using its certificate ID.
 * Retrieves certificate details from the blockchain and fetches the PDF from Pinata.
 */
exports.verifyCertificateById = async (req, res) => {
  try {
    const certificateId = req.params.certificateId;
    const result = await contract.methods.getCertificate(certificateId).call();
    const ipfsHash = result[4]; // Assuming IPFS hash is the 5th element

    if (!ipfsHash) {
      return res.status(404).json({ error: 'Certificate not found on blockchain' });
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
    res.status(500).json({ error: 'Certificate retrieval failed' });
  }
};
