import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
import fs from 'fs';
import path from 'path';

export const generateCertificatePdf = async (
  outputPath,
  uid,
  candidateName,
  courseName,
  orgName,
  logoPath
) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Setup write stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add certificate content
      if (logoPath && fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100 });
      }

      doc.fontSize(24)
        .text('Certificate of Completion', { align: 'center' })
        .moveDown(1);

      doc.fontSize(18)
        .text(`This is to certify that ${candidateName}`, { align: 'center' })
        .moveDown(0.5);

      doc.fontSize(16)
        .text(`has successfully completed the ${courseName}`, { align: 'center' })
        .moveDown(0.5);

      doc.fontSize(16)
        .text(`offered by ${orgName}`, { align: 'center' })
        .moveDown(2);

      doc.fontSize(12)
        .text(`Certificate ID: ${uid}`, { align: 'left' })
        .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};