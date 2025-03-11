// src/routes/certificateRoutes.js
const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');

// Configure multer for file uploads (temporary storage in 'uploads/' folder)
const upload = multer({ dest: 'uploads/' });

// Protected route for generating a certificate (e.g., Institute only)
router.post('/institute/generate-certificate', authMiddleware, certificateController.generateCertificate);

// Endpoint for verifying certificate via PDF upload (open to all)
router.post('/verify-pdf', upload.single('certificate'), certificateController.verifyCertificatePdf);

// Endpoint for verifying certificate by certificate ID
router.get('/verify/:certificateId', certificateController.verifyCertificateById);

module.exports = router;
