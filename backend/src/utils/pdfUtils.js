import PDFDocument from 'pdfkit';
import fs from 'fs';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

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

// Function to download image from URL
const downloadImageFromURL = async (url, outputPath) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
    return outputPath;
  } catch (error) {
    console.error('Error downloading image from URL:', error);
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

      // ==================== PROFESSIONAL CERTIFICATE DESIGN ====================

      // Accent color based on certificate type
      let accentColor = '#f59e0b'; // Gold/amber for achievement
      let secondaryColor = '#fbbf24'; // Lighter gold
      if (certificateType === 'COMPLETION') {
        accentColor = '#0891b2'; // Teal/cyan for completion
        secondaryColor = '#06b6d4';
      } else if (certificateType === 'PARTICIPATION') {
        accentColor = '#059669'; // Green for participation
        secondaryColor = '#10b981';
      }

      // Background - clean white
      doc.rect(0, 0, doc.page.width, doc.page.height)
        .fillColor('#ffffff')
        .fill();

      // Main border - double line frame
      const outerBorder = 15;
      const innerBorder = 20;
      
      // Outer border
      doc.rect(outerBorder, outerBorder, doc.page.width - outerBorder * 2, doc.page.height - outerBorder * 2)
        .lineWidth(2)
        .strokeColor(accentColor)
        .stroke();
      
      // Inner border
      doc.rect(innerBorder, innerBorder, doc.page.width - innerBorder * 2, doc.page.height - innerBorder * 2)
        .lineWidth(1)
        .strokeColor('#d1d5db')
        .stroke();

      // Decorative header bar with diagonal stripes
      const headerHeight = 100;
      
      // Main header background
      doc.rect(innerBorder, innerBorder, doc.page.width - innerBorder * 2, headerHeight)
        .fillColor(accentColor)
        .fill();

      // Diagonal decorative stripes on the right side of header
      const stripeStartX = doc.page.width - 250;
      const stripeWidth = 80;
      const stripeSpacing = 20;
      
      for (let i = 0; i < 3; i++) {
        const x = stripeStartX + (i * (stripeWidth + stripeSpacing));
        doc.save();
        doc.moveTo(x, innerBorder)
          .lineTo(x + stripeWidth, innerBorder)
          .lineTo(x + stripeWidth + 50, innerBorder + headerHeight)
          .lineTo(x + 50, innerBorder + headerHeight)
          .closePath()
          .fillOpacity(i === 1 ? 0.3 : 0.15)
          .fill(secondaryColor);
        doc.restore();
      }
      
      doc.fillOpacity(1);

      // ===== HEADER SECTION WITH LOGO AND INSTITUTION =====
      
      // Download and place institution logo if it's a URL
      let logoImagePath = null;
      if (institutionLogo && institutionLogo.startsWith('http')) {
        const tempLogoPath = path.join(assetsPath, `temp_logo_${Date.now()}.png`);
        logoImagePath = await downloadImageFromURL(institutionLogo, tempLogoPath);
      } else if (institutionLogo && fs.existsSync(institutionLogo)) {
        logoImagePath = institutionLogo;
      } else if (logoPath && fs.existsSync(logoPath)) {
        logoImagePath = logoPath;
      } else if (fs.existsSync(defaultLogoPath)) {
        logoImagePath = defaultLogoPath;
      }

      // Logo in header (left side)
      const logoSize = 70;
      const logoX = 40;
      const logoY = innerBorder + 15;
      
      if (logoImagePath && fs.existsSync(logoImagePath)) {
        // White circle background for logo
        doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 5)
          .fillColor('#ffffff')
          .fill();
        
        doc.image(logoImagePath, logoX, logoY, { 
          width: logoSize, 
          height: logoSize, 
          fit: [logoSize, logoSize],
          align: 'center',
          valign: 'center'
        });
      }

      // Institution name and tagline in header
      const institutionTextX = logoX + logoSize + 20;
      const institutionTextY = logoY + 10;
      
      doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(institutionName.toUpperCase(), institutionTextX, institutionTextY, {
          width: 400
        });

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#ffffff')
        .fillOpacity(0.9)
        .text('Blockchain-Verified Certificates', institutionTextX, institutionTextY + 30)
        .fillOpacity(1);

      // Date and certificate number in top right corner of header
      const headerRightX = doc.page.width - 200;
      const dateText = issuedDate ? new Date(issuedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#ffffff')
        .fillOpacity(0.8)
        .text(dateText, headerRightX, logoY + 15, {
          width: 150,
          align: 'right'
        });

      if (referenceId) {
        doc.fontSize(9)
          .fillColor('#ffffff')
          .fillOpacity(0.8)
          .text(`CERTIFICATE NO: ${referenceId}`, headerRightX, logoY + 30, {
            width: 150,
            align: 'right'
          });
      }
      
      doc.fillOpacity(1);

      // ===== MAIN CONTENT AREA =====
      const contentStartY = innerBorder + headerHeight + 40;
      const contentWidth = doc.page.width - innerBorder * 2 - 80;
      const contentCenterX = doc.page.width / 2;

      // "CERTIFICATE" title
      doc.fontSize(48)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('CERTIFICATE', 0, contentStartY, {
          width: doc.page.width,
          align: 'center',
          characterSpacing: 2
        });

      // Certificate type subtitle
      doc.fontSize(20)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`OF ${certificateType}`, 0, contentStartY + 55, {
          width: doc.page.width,
          align: 'center',
          characterSpacing: 1
        });

      // Decorative line
      const decorLineWidth = 120;
      doc.moveTo(contentCenterX - decorLineWidth / 2, contentStartY + 85)
        .lineTo(contentCenterX + decorLineWidth / 2, contentStartY + 85)
        .lineWidth(2)
        .strokeColor(accentColor)
        .stroke();

      // "presented to" text
      doc.fontSize(14)
        .font('Helvetica-Oblique')
        .fillColor('#9ca3af')
        .text('presented to', 0, contentStartY + 105, {
          width: doc.page.width,
          align: 'center'
        });

      // Recipient name - large and elegant
      const nameFontSize = candidateName.length > 25 ? 34 : 42;
      doc.fontSize(nameFontSize)
        .font('Times-Italic')
        .fillColor('#1f2937')
        .text(candidateName, 40, contentStartY + 135, {
          width: doc.page.width - 80,
          align: 'center',
          characterSpacing: 0.5
        });

      // Decorative underline for name
      const nameUnderlineWidth = Math.min(candidateName.length * (nameFontSize * 0.6), doc.page.width - 200);
      doc.moveTo(contentCenterX - nameUnderlineWidth / 2, contentStartY + 185)
        .lineTo(contentCenterX + nameUnderlineWidth / 2, contentStartY + 185)
        .lineWidth(1.5)
        .strokeColor('#d1d5db')
        .stroke();

      // Achievement description
      let achievementText;
      switch (certificateType) {
        case 'COMPLETION':
          achievementText = 'for successfully completing the course';
          break;
        case 'PARTICIPATION':
          achievementText = 'for active participation in';
          break;
        case 'ACHIEVEMENT':
        default:
          achievementText = 'for outstanding achievement in';
          break;
      }

      doc.fontSize(13)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(achievementText, 40, contentStartY + 205, {
          width: doc.page.width - 80,
          align: 'center',
          lineGap: 3
        });

      // Course name - prominent
      const courseNameFontSize = courseName.length > 40 ? 18 : 22;
      doc.fontSize(courseNameFontSize)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text(courseName, 40, contentStartY + 235, {
          width: doc.page.width - 80,
          align: 'center',
          characterSpacing: 0.3
        });

      // ===== BOTTOM SECTION - SIGNATURE AND VERIFICATION =====
      const bottomY = doc.page.height - 145;
      
      // Signature section - centered
      const signatureY = bottomY - 30;
      const signatureWidth = 180;
      const leftSignatureX = contentCenterX - signatureWidth - 100;
      const rightSignatureX = contentCenterX + 100;

      // Line above date
      doc.moveTo(leftSignatureX + 20, signatureY - 5)
        .lineTo(leftSignatureX + signatureWidth - 20, signatureY - 5)
        .lineWidth(1)
        .strokeColor(accentColor)
        .stroke();

      // Date on the left
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(issuedDate ? new Date(issuedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), leftSignatureX, signatureY + 3, {
          width: signatureWidth,
          align: 'center'
        });

      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('DATE', leftSignatureX, signatureY + 20, {
          width: signatureWidth,
          align: 'center'
        });

      // Award badge in center
      const badgeSize = 45;
      const badgeX = contentCenterX - badgeSize / 2;
      const badgeY = signatureY - 10;
      
      // Outer circle
      doc.circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2)
        .fillColor(accentColor)
        .fill();
      
      // Inner circle
      doc.circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2 - 4)
        .fillColor(secondaryColor)
        .fill();

      // Star symbol in badge - using proper Unicode star
      doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('★', badgeX + badgeSize / 2 - 6, badgeY + badgeSize / 2 - 10);

      // Line above signature
      doc.moveTo(rightSignatureX + 20, signatureY - 5)
        .lineTo(rightSignatureX + signatureWidth - 20, signatureY - 5)
        .lineWidth(1)
        .strokeColor(accentColor)
        .stroke();

      // Authorized signature on the right
      doc.fontSize(14)
        .font('Times-Italic')
        .fillColor('#4b5563')
        .text('Authorized Signature', rightSignatureX, signatureY + 3, {
          width: signatureWidth,
          align: 'center'
        });

      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('AUTHORIZED SIGNATORY', rightSignatureX, signatureY + 20, {
          width: signatureWidth,
          align: 'center'
        });

      // QR Code and verification info at bottom
      const qrSize = 75;
      const qrX = 45;
      const qrY = doc.page.height - 105;

      if (qrCodeDataURL) {
        doc.image(qrCodeDataURL, qrX, qrY, { width: qrSize });
      } else if (fs.existsSync(qrCodePath)) {
        doc.image(qrCodePath, qrX, qrY, { width: qrSize });
      }

      // Verification text next to QR
      const verifyTextX = qrX + qrSize + 12;
      doc.fontSize(7)
        .font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text('VERIFY THIS CERTIFICATE', verifyTextX, qrY + 2);

      doc.fontSize(6.5)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Code: ${verificationCode}`, verifyTextX, qrY + 15);

      if (validUntil) {
        doc.fontSize(6.5)
          .fillColor('#6b7280')
          .text(`Valid Until: ${new Date(validUntil).toLocaleDateString()}`, verifyTextX, qrY + 26);
      }

      doc.fontSize(6.5)
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .text('🔒 Blockchain Secured', verifyTextX, qrY + (validUntil ? 37 : 26));

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        // Clean up temporary files
        if (fs.existsSync(qrCodePath)) {
          fs.unlinkSync(qrCodePath);
        }
        // Clean up temporary logo file if it was downloaded
        if (logoImagePath && logoImagePath.includes('temp_logo_')) {
          try {
            if (fs.existsSync(logoImagePath)) {
              fs.unlinkSync(logoImagePath);
            }
          } catch (err) {
            console.warn('Could not delete temporary logo file:', err.message);
          }
        }
        resolve(outputPath);
      });
      stream.on('error', (err) => {
        // Clean up temporary files in case of error
        if (fs.existsSync(qrCodePath)) {
          fs.unlinkSync(qrCodePath);
        }
        if (logoImagePath && logoImagePath.includes('temp_logo_')) {
          try {
            if (fs.existsSync(logoImagePath)) {
              fs.unlinkSync(logoImagePath);
            }
          } catch (cleanupErr) {
            console.warn('Could not delete temporary logo file:', cleanupErr.message);
          }
        }
        reject(err);
      });
    } catch (error) {
      // Clean up temporary files in case of error
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
      reject(error);
    }
  });
};