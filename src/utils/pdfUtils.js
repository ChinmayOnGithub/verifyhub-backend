// src/utils/pdfUtils.js
const fs = require('fs');
const PDFDocument = require('pdfkit');
const pdfParse = require('pdf-parse');

/**
 * Generates a certificate PDF with the provided details.
 * Uses PDFKit to create the document.
 * @param {string} outputPath - Path to save the PDF.
 * @param {string} uid - Unique certificate identifier.
 * @param {string} candidateName - Candidate's name.
 * @param {string} courseName - Course name.
 * @param {string} orgName - Organization name.
 * @param {string} instituteLogoPath - Path to the institute logo (optional).
 * @returns {Promise<void>}
 */
exports.generateCertificate = (outputPath, uid, candidateName, courseName, orgName, instituteLogoPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add institute logo if available
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
        .text("Certificate of Completion", { align: 'center' })
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
 * Extracts certificate details from a PDF.
 * Assumes the PDF follows this structure:
 *  - First line: Organization Name
 *  - Fourth line: Candidate Name
 *  - Sixth line: UID
 *  - Last line: Course Name
 * @param {string} filePath - Path to the PDF file.
 * @returns {Promise<Object>} - Object containing uid, candidateName, courseName, orgName.
 */
exports.extractCertificate = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const lines = data.text.split('\n').map(line => line.trim()).filter(line => line !== '');
  if (lines.length < 6) {
    throw new Error("Insufficient data in PDF to extract certificate details");
  }
  const orgName = lines[0];
  const candidateName = lines[3];
  const uid = lines[5];
  const courseName = lines[lines.length - 1];
  return { uid, candidateName, courseName, orgName };
};
