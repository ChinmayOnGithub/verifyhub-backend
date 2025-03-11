import fs from 'fs';
import PDFDocument from 'pdfkit';
import extractTextFromPDF from './pdfReaderUtils.js';

/**
 * Generates a certificate PDF with the provided details.
 * @param {string} outputPath - The path to save the PDF.
 * @param {string} uid - Unique certificate identifier.
 * @param {string} candidateName - Candidate's name.
 * @param {string} courseName - Course name.
 * @param {string} orgName - Organization name.
 * @param {string} instituteLogoPath - Path to the institute logo (optional).
 * @returns {Promise<void>}
 */
export const generateCertificate = (outputPath, uid, candidateName, courseName, orgName, instituteLogoPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add institute logo if exists
      if (instituteLogoPath && fs.existsSync(instituteLogoPath)) {
        doc.image(instituteLogoPath, { width: 150, height: 150, align: 'center' });
        doc.moveDown();
      }

      // Add organization name
      doc.font('Helvetica-Bold')
        .fontSize(15)
        .text(orgName, { align: 'center' })
        .moveDown(2);

      // Certificate title
      doc.fontSize(25)
        .text('Certificate of Completion', { align: 'center' })
        .moveDown();

      // Recipient details
      const recipientText = `This is to certify that\n\n${candidateName}\nwith UID ${uid}\nhas successfully completed the course:\n${courseName}`;
      doc.font('Helvetica')
        .fontSize(14)
        .text(recipientText, { align: 'center', lineGap: 6 });

      // Finalize PDF
      doc.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Extracts certificate details from a PDF using pdfreader.
 * Assumes the following structure:
 *  - First line: Organization Name
 *  - Fourth line: Candidate Name
 *  - Sixth line: UID
 *  - Last line: Course Name
 * @param {string} filePath - Path to the PDF file.
 * @returns {Promise<Object>} - Object with uid, candidateName, courseName, orgName.
 */
export const extractCertificate = async (filePath) => {
  const text = await extractTextFromPDF(filePath);
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');

  if (lines.length < 6) {
    throw new Error('Insufficient data in PDF to extract certificate details');
  }

  const orgName = lines[0];
  const candidateName = lines[3];
  const uid = lines[5];
  const courseName = lines[lines.length - 1];
  return { uid, candidateName, courseName, orgName };
};

// Export both functions as named and default (if needed)
export default { generateCertificate, extractCertificate };
