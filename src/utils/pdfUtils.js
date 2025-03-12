// generates pdf out of the data provided
export const generateCertificatePdf = (
  outputPath,
  certificateId, // New parameter
  uid,
  candidateName,
  courseName,
  orgName,
  instituteLogoPath
) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER' });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Add institute logo if exists
    if (instituteLogoPath && fs.existsSync(instituteLogoPath)) {
      doc.image(instituteLogoPath, 50, 45, { width: 100 });
      doc.moveDown(2);
    }

    // Certificate ID Section
    doc.fontSize(12)
      .text(`Certificate ID: ${certificateId}`, { align: 'left' })
      .moveDown(1);

    // Organization Section
    doc.fontSize(18)
      .text(`Organization: ${orgName}`, { align: 'center' })
      .moveDown(1);

    // Title
    doc.fontSize(22)
      .text('CERTIFICATE OF COMPLETION', { align: 'center' })
      .moveDown(2);

    // Details
    doc.fontSize(14)
      .text(`Candidate Name: ${candidateName}`, { align: 'left' })
      .text(`UID: ${uid}`, { align: 'left' })
      .text(`Course Name: ${courseName}`, { align: 'left' });

    doc.end();
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
};