// -------------------------------
// File: utils/pdfHashUtils.js
// -------------------------------
import { createHash } from 'crypto';
import Certificate from '../models/certificate.model.js';

export const computePDFHash = (pdfBuffer) => {
  return createHash('sha256')
    .update(pdfBuffer)
    .digest('hex');
};

export const getStoredHashFromBlockchain = async (certificateId) => {
  // Replace with your actual blockchain call
  const certificate = await Certificate.findOne({ certificateId });
  if (!certificate) throw new Error('Certificate not found in registry');
  return certificate.ipfsHash;
};