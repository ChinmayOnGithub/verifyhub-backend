// src/routes/certificate.routes.js
import express from 'express';
import { pdfUpload } from '../middlewares/fileUpload.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';
import {
  generateCertificate,
  verifyCertificateById,
  verifyCertificatePdf,
  getCertificateMetadata,
  uploadExternalCertificate,
  searchByCID,
  getCertificateStats,
  getOrgCertificates,
  getCertificatePDF
} from '../controllers/certificate.controller.js';

const router = express.Router();

// Rate limiting for public endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Certificate Generation
router.post('/', authMiddleware, generateCertificate);

// Certificate Verification
router.get('/:certificateId/verify', apiLimiter, verifyCertificateById);
router.post('/verify/pdf', apiLimiter, pdfUpload.single('certificate'), verifyCertificatePdf);

// Certificate Access
router.get('/:certificateId', apiLimiter, getCertificateMetadata);
router.get('/:certificateId/pdf', apiLimiter, getCertificatePDF);

// External Certificates
router.post('/external', authMiddleware, pdfUpload.single('certificate'), uploadExternalCertificate);
router.get('/external/:cid', apiLimiter, searchByCID);

// Statistics & Analytics
router.get('/stats', apiLimiter, getCertificateStats);

// Organization Certificates
router.get('/organization/:orgName', apiLimiter, getOrgCertificates);

export default router;