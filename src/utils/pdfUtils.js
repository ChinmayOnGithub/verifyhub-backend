import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
import fs from 'fs';

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
      // Create PDF document with explicit landscape dimensions
      const doc = new PDFDocument({
        size: [595, 842], // A4 landscape dimensions in points (842w x 595h)
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });

      // Setup write stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add decorative border
      doc.rect(30, 30, 782, 535) // Full page border
        .lineWidth(3)
        .stroke('#1a365d');

      // Add header
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(orgName, 50, 60, { align: 'left' });

      // Main certificate title
      doc.fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#2b6cb0')
        .text('CERTIFICATE OF ACHIEVEMENT', 0, 150, { align: 'center' });

      // Body content
      const contentY = 250;
      doc.fontSize(22)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('This certificate is presented to', 0, contentY, { align: 'center' });

      doc.fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text(candidateName.toUpperCase(), 0, contentY + 50, { align: 'center' });

      doc.fontSize(20)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(`for successfully completing the`, 0, contentY + 120, { align: 'center' });

      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#2b6cb0')
        .text(courseName, 0, contentY + 160, { align: 'center' });

      doc.fontSize(18)
        .font('Helvetica-Oblique')
        .fillColor('#718096')
        .text(`Awarded by ${orgName}`, 0, contentY + 210, { align: 'center' });

      // Certificate ID and Date
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(`Certificate ID: ${uid}`, 50, 500)
        .text(`Date: ${new Date().toLocaleDateString()}`, 50, 520, { align: 'left' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};