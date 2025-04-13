import PDFDocument from 'pdfkit';
import fs from 'fs';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths for assets
const assetsPath = path.join(__dirname, '../../assets');
const defaultLogoPath = path.join(assetsPath, 'default-logo.png');
const watermarkPath = path.join(assetsPath, 'watermark.png');
const sealPath = path.join(assetsPath, 'seal.png');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, { recursive: true });
}

// Function to generate a temporary QR code file
const generateQRCodeFile = async (text, outputPath) => {
  try {
    await QRCode.toFile(outputPath, text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200
    });
    return outputPath;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

// Function to generate QR code as a data URL
const generateQRCodeDataURL = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200
    });
  } catch (error) {
    console.error('Error generating QR code data URL:', error);
    return null;
  }
};

export const generateCertificatePdf = async (
  outputPath,
  referenceId,
  candidateName,
  courseName,
  institutionName,
  logoPath,
  verificationCode,
  verificationUrl,
  issuedDate = "",
  institutionLogo = "",
  cryptographicSignature = "",
  certificateId = "",
  includeDeveloperPage = false,
  validUntil = "",
  additionalFields = {},
  certificateType = "ACHIEVEMENT" // New parameter for certificate type (ACHIEVEMENT, COMPLETION, PARTICIPATION)
) => {
  return new Promise(async (resolve, reject) => {
    // Create a frontend-friendly verification URL
    let frontendUrl;
    try {
      const urlObj = new URL(verificationUrl);
      // Replace port 3000 with 5173 for the frontend
      const host = urlObj.host.replace(/:\d+$/, '') || urlObj.hostname;
      frontendUrl = `${urlObj.protocol}//${host}:5173/verify?code=${verificationCode}&auto=true`;
      console.log(`Created frontend verification URL: ${frontendUrl}`);
    } catch (error) {
      console.warn("Could not parse verification URL, using as-is:", error);
      // Extract base URL without port and add :5173
      const baseUrl = verificationUrl.split('/api/')[0].replace(/:\d+(?=\/)/, '');
      frontendUrl = `${baseUrl}:5173/verify?code=${verificationCode}&auto=true`;
    }

    // Normalize certificate type (default to ACHIEVEMENT if invalid)
    const validTypes = ["ACHIEVEMENT", "COMPLETION", "PARTICIPATION"];
    certificateType = certificateType.toUpperCase();
    if (!validTypes.includes(certificateType)) {
      certificateType = "ACHIEVEMENT";
    }

    // Generate QR code as data URL to avoid file system issues
    const qrCodeDataURL = await generateQRCodeDataURL(frontendUrl);

    // For backwards compatibility, still generate the temp file
    const qrCodePath = path.join(assetsPath, `${verificationCode}_qr.png`);
    await generateQRCodeFile(frontendUrl, qrCodePath);

    try {
      // Create PDF document with landscape orientation for better space usage
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        info: {
          Title: `Certificate of ${certificateType.toLowerCase()} - ${candidateName}`,
          Author: institutionName,
          Subject: courseName,
          Keywords: `certificate,blockchain,verification,${certificateType.toLowerCase()}`,
          CreationDate: new Date(),
        }
      });

      // Setup write stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // ==================== OPTIMIZED SINGLE PAGE CERTIFICATE ====================

      // Enhanced background with subtle gradient effect
      doc.rect(0, 0, doc.page.width, doc.page.height)
        .fillColor('#f9f9f9')
        .fill();

      // Add subtle decorative element - a colored bar at the top and bottom
      const barHeight = 15;
      doc.rect(0, 0, doc.page.width, barHeight)
        .fillColor('#1a365d')
        .fill();
      doc.rect(0, doc.page.height - barHeight, doc.page.width, barHeight)
        .fillColor('#1a365d')
        .fill();

      // Add elegant border with rounded corners and shadow effect
      doc.roundedRect(25, 25, doc.page.width - 50, doc.page.height - 50, 10)
        .lineWidth(1.5)
        .strokeColor('#1a365d')
        .stroke();

      // Add a very subtle watermark pattern for anti-counterfeiting
      if (fs.existsSync(watermarkPath)) {
        doc.image(watermarkPath, doc.page.width / 2 - 200, doc.page.height / 2 - 200, {
          width: 400,
          opacity: 0.04
        });
      }

      // ===== HEADER SECTION =====
      // Logo placement - top left
      const logoSize = 70;
      const logoY = 35;
      if (institutionLogo && fs.existsSync(institutionLogo)) {
        doc.image(institutionLogo, 40, logoY, { width: logoSize });
      } else if (logoPath && fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, logoY, { width: logoSize });
      } else if (fs.existsSync(defaultLogoPath)) {
        doc.image(defaultLogoPath, 40, logoY, { width: logoSize });
      }

      // Institution name - centered at top with improved styling
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text(institutionName, 120, logoY + 8, {
          align: 'center',
          width: doc.page.width - 240
        });

      // Add digital seal on right side if available
      if (fs.existsSync(sealPath)) {
        doc.image(sealPath, doc.page.width - 110, logoY, { width: logoSize });
      }

      // ===== TITLE SECTION =====
      const titleY = 120;
      // Add decorative line above the title
      const upperLineY = titleY - 10;
      doc.moveTo(doc.page.width / 2 - 170, upperLineY)
        .lineTo(doc.page.width / 2 + 170, upperLineY)
        .lineWidth(1)
        .stroke('#2b6cb0');

      doc.fontSize(38)
        .font('Helvetica-Bold')
        .fillColor('#2b6cb0')
        .text('CERTIFICATE', 0, titleY, { align: 'center' })
        .fontSize(18)
        .fillColor('#4a5568')
        .text(`OF ${certificateType}`, 0, titleY + 42, { align: 'center' });

      // Add decorative line below the "OF ACHIEVEMENT" text
      const lineY = titleY + 75;
      doc.moveTo(doc.page.width / 2 - 170, lineY)
        .lineTo(doc.page.width / 2 + 170, lineY)
        .lineWidth(1)
        .stroke('#2b6cb0');

      // ===== RECIPIENT & COURSE SECTION =====
      const contentY = lineY + 25;

      // "This is to certify that"
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('This is to certify that', 0, contentY, { align: 'center' });

      // Recipient name - make font size responsive to name length with improved styling
      const fontSize = candidateName.length > 25 ? 30 : 36;
      doc.fontSize(fontSize)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text(candidateName.toUpperCase(), 0, contentY + 25, {
          align: 'center',
          characterSpacing: 0.5 // Add slight character spacing for better readability
        });

      // Text based on certificate type
      let completionText;
      switch (certificateType) {
        case 'COMPLETION':
          completionText = 'has successfully completed the course';
          break;
        case 'PARTICIPATION':
          completionText = 'has participated in the course';
          break;
        case 'ACHIEVEMENT':
        default:
          completionText = 'has successfully achieved excellence in';
          break;
      }

      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(completionText, 0, contentY + 70, { align: 'center' });

      // Course name - make font size responsive to course name length with improved styling
      const courseNameFontSize = courseName.length > 40 ? 22 : 26;
      doc.fontSize(courseNameFontSize)
        .font('Helvetica-Bold')
        .fillColor('#2b6cb0')
        .text(courseName, 0, contentY + 95, {
          align: 'center',
          width: doc.page.width - 80,
          characterSpacing: 0.3
        });

      // ===== UNIFIED DETAILS SECTION - USING TWO COLUMNS AT BOTTOM =====
      // This creates a more organized bottom section with better space utilization

      // Create a subtle container for both columns with improved styling
      const detailsContainerX = 35;
      const detailsContainerWidth = doc.page.width - 70 - 130; // Leave space for QR code

      // Calculate dimensions
      const leftX = detailsContainerX + 5; // Reduced margin to move content more to the left
      const detailsY = doc.page.height - 140; // Move up slightly
      const columnWidth = detailsContainerWidth / 2 - 10; // Split width between columns with spacing

      // Create a unified background for both detail sections
      doc.roundedRect(detailsContainerX, detailsY - 5, detailsContainerWidth, 110, 5)
        .fillOpacity(0.04)
        .fillColor('#1a365d')
        .fill()
        .fillOpacity(1);

      // Left column - Certificate details
      // Title for the details section with improved styling
      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text('CERTIFICATE DETAILS', leftX, detailsY);

      // Add a small decorative line below the section title
      doc.moveTo(leftX, detailsY + 17)
        .lineTo(leftX + 60, detailsY + 17)
        .lineWidth(1)
        .stroke('#2b6cb0');

      // Technical details with improved styling
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#4a5568');

      let currentY = detailsY + 22;
      const lineSpacing = 15;

      // Date information
      const issuedText = issuedDate ? new Date(issuedDate).toLocaleDateString() : new Date().toLocaleDateString();
      doc.text(`Date Issued: `, leftX, currentY)
        .font('Helvetica-Bold')
        .text(issuedText, leftX + 70, currentY);
      currentY += lineSpacing;

      if (validUntil) {
        doc.font('Helvetica')
          .text(`Valid Until: `, leftX, currentY)
          .font('Helvetica-Bold')
          .text(new Date(validUntil).toLocaleDateString(), leftX + 70, currentY);
        currentY += lineSpacing;
      }

      doc.font('Helvetica')
        .text(`Reference ID: `, leftX, currentY)
        .font('Helvetica-Bold')
        .text(referenceId, leftX + 70, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica')
        .text(`Verification Code: `, leftX, currentY)
        .font('Helvetica-Bold')
        .text(verificationCode, leftX + 70, currentY);
      currentY += lineSpacing;

      // Right column - Blockchain verification  
      const rightX = leftX + columnWidth + 20; // Increased spacing between columns

      // Title for the blockchain section with improved styling
      currentY = detailsY; // Reset Y position for right column
      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text('BLOCKCHAIN VERIFIED', rightX, currentY);

      // Add a small decorative line below the section title
      doc.moveTo(rightX, detailsY + 17)
        .lineTo(rightX + 60, detailsY + 17)
        .lineWidth(1)
        .stroke('#2b6cb0');

      currentY += 22;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('This certificate is secured using blockchain technology for tamper-proof verification.',
          rightX, currentY, { width: columnWidth });

      currentY += 28;

      // Add certificate ID in a truncated format with improved styling
      if (certificateId) {
        const shortCertId = `${certificateId.substring(0, 8)}...${certificateId.substring(certificateId.length - 8)}`;
        doc.font('Helvetica')
          .text(`Certificate ID: `, rightX, currentY)
          .font('Helvetica-Bold')
          .text(shortCertId, rightX + 80, currentY);
        currentY += lineSpacing;
      }

      // Add signature if available (shortened)
      if (cryptographicSignature) {
        const shortSig = `${cryptographicSignature.substring(0, 8)}...${cryptographicSignature.substring(cryptographicSignature.length - 8)}`;
        doc.font('Helvetica')
          .text(`Digital Signature: `, rightX, currentY)
          .font('Helvetica-Bold')
          .text(shortSig, rightX + 80, currentY);
        currentY += lineSpacing;
      }

      // Make verification URL clickable
      // Create auto-verification URL with code parameter
      const completeVerificationUrl = `${frontendUrl.split('?')[0]}?code=${verificationCode}&auto=true`;

      // Add clickable "Verify at:" text with link
      const verifyText = `Verify at: `;
      const urlText = frontendUrl.split('?')[0];
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(verifyText, rightX, currentY, { continued: true })
        .fillColor('#0066cc')
        .font('Helvetica-Bold')
        .text(urlText, {
          underline: true,
          link: completeVerificationUrl
        });

      // ===== QR CODE PLACEMENT =====
      // Bottom right - adjust position for better spacing
      let qrX = doc.page.width - 155;
      let qrY = doc.page.height - 145;
      let qrSize = 115;

      // Check for valid numbers to prevent NaN errors
      if (isNaN(qrX) || isNaN(qrY) || isNaN(qrSize)) {
        console.warn('QR code positioning values contain NaN:', { qrX, qrY, qrSize, pageWidth: doc.page.width, pageHeight: doc.page.height });
        // Use fallback values
        qrX = 600;
        qrY = 500;
        qrSize = 115;
      }

      // Additional safety check for derived values
      const safeRect = (x, y, width, height, radius) => {
        if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || isNaN(radius)) {
          console.warn('Invalid parameters for roundedRect:', { x, y, width, height, radius });
          return false;
        }
        return true;
      };

      // Add a subtle background for QR code with rounded corners
      if (safeRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 5)) {
        doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 5)
          .fillOpacity(0.04)
          .fillColor('#1a365d')
          .fill()
          .fillOpacity(1);
      }

      if (qrCodeDataURL) {
        // Add a white background for QR code with slight rounding
        if (safeRect(qrX, qrY, qrSize, qrSize, 2)) {
          doc.roundedRect(qrX, qrY, qrSize, qrSize, 2)
            .fill('#ffffff');

          // Add the QR code
          doc.image(qrCodeDataURL, qrX, qrY, { width: qrSize });

          // Improved "Scan to verify" text
          // First create a semi-transparent blue background
          if (safeRect(qrX, qrY + qrSize - 22, qrSize, 22, [0, 0, 2, 2])) {
            doc.roundedRect(qrX, qrY + qrSize - 22, qrSize, 22, [0, 0, 2, 2])
              .fillOpacity(0.1)
              .fillColor('#1a365d')
              .fill()
              .fillOpacity(1);
          }

          // Draw text with better positioning and style
          doc.fontSize(10)
            .fillColor('#1a365d')
            .font('Helvetica-Bold')
            .text('Scan to verify', qrX + 5, qrY + qrSize - 17, {
              width: qrSize - 10,
              align: 'center'
            });
        }
      }
      // Fallback method: Use file if data URL failed
      else if (fs.existsSync(qrCodePath)) {
        // Add a white background for QR code with slight rounding
        if (safeRect(qrX, qrY, qrSize, qrSize, 2)) {
          doc.roundedRect(qrX, qrY, qrSize, qrSize, 2)
            .fill('#ffffff');

          // Add the QR code
          doc.image(qrCodePath, qrX, qrY, { width: qrSize });

          // Improved "Scan to verify" text
          // First create a semi-transparent blue background
          if (safeRect(qrX, qrY + qrSize - 22, qrSize, 22, [0, 0, 2, 2])) {
            doc.roundedRect(qrX, qrY + qrSize - 22, qrSize, 22, [0, 0, 2, 2])
              .fillOpacity(0.1)
              .fillColor('#1a365d')
              .fill()
              .fillOpacity(1);
          }

          // Draw text with better positioning and style
          doc.fontSize(10)
            .fillColor('#1a365d')
            .font('Helvetica-Bold')
            .text('Scan to verify', qrX + 5, qrY + qrSize - 17, {
              width: qrSize - 10,
              align: 'center'
            });
        }
      }

      // Add a note about the verification options with improved styling
      doc.fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#4a5568')
        .text("Note: Either scan the QR code or click the blue link above to verify this certificate online.",
          leftX, doc.page.height - 30, { width: columnWidth * 2 });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        // Clean up temporary QR code file
        if (fs.existsSync(qrCodePath)) {
          fs.unlinkSync(qrCodePath);
        }
        resolve(outputPath);
      });
      stream.on('error', reject);
    } catch (error) {
      // Clean up temporary files in case of error
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
      reject(error);
    }
  });
};