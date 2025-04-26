import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  console.log('Creating email transporter with the following config:');
  console.log('- HOST:', process.env.EMAIL_HOST);
  console.log('- PORT:', process.env.EMAIL_PORT);
  console.log('- SECURE:', process.env.EMAIL_SECURE);
  console.log('- USER:', process.env.EMAIL_USER);
  console.log('- PASSWORD:', process.env.EMAIL_PASSWORD ? '(set)' : '(not set)');

  // Gmail-specific configuration
  const isGmail = process.env.EMAIL_HOST?.includes('gmail');

  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Additional Gmail options
    ...(isGmail && {
      service: 'gmail',
      // Prioritize TLS
      requireTLS: true,
      // Gmail specific options
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      }
    })
  };

  return nodemailer.createTransport(config);
};

/**
 * Generate common email headers to improve deliverability
 * @param {string} from - Sender email address
 * @param {string} to - Recipient email address
 * @returns {Object} - Email headers
 */
const generateDeliverabilityHeaders = (from, to) => {
  const domain = from.split('@')[1];
  const messageId = `${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}`;

  return {
    'Message-ID': `<${messageId}>`,
    'X-Mailer': 'VerifyHub Certificate System',
    'X-Priority': '3', // Normal priority
    'List-Unsubscribe': `<mailto:${from}?subject=Unsubscribe>`,
    'X-Entity-Ref-ID': messageId, // Helps prevent duplicate emails being marked as spam
    'Feedback-ID': 'CERT:VerifyHub', // Helps identify message for spam reporting
    'Precedence': 'Bulk',
    'Reply-To': from
  };
};

/**
 * Test email sending functionality
 * @param {string} recipientEmail - Email address to send the test message to
 * @returns {Promise<Object>} - Result of the test email sending operation
 */
export const testEmailSending = async (recipientEmail) => {
  try {
    console.log('Testing email sending to:', recipientEmail);

    // Check if email configuration is missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env file.');
      return {
        success: false,
        error: 'Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env file.'
      };
    }

    // Check if password is empty
    if (process.env.EMAIL_PASSWORD.trim() === '') {
      console.warn('EMAIL_PASSWORD environment variable is empty');
      return {
        success: false,
        error: 'EMAIL_PASSWORD is not set properly in the .env file'
      };
    }

    const transporter = createTransporter();

    // Verify SMTP connection configuration
    try {
      console.log('Verifying SMTP connection...');
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP connection verification failed:', verifyError);

      // Gmail-specific error handling and suggestions
      if (verifyError.message.includes('authentication') || verifyError.message.includes('auth')) {
        return {
          success: false,
          error: `Gmail authentication failed: ${verifyError.message}. Make sure you're using an App Password if you have 2FA enabled.`
        };
      }

      return {
        success: false,
        error: `SMTP connection failed: ${verifyError.message}`
      };
    }

    const from = `"VerifyHub Team" <${process.env.EMAIL_USER}>`;

    // Add anti-spam headers
    const headers = generateDeliverabilityHeaders(process.env.EMAIL_USER, recipientEmail);

    // Prepare email content
    const mailOptions = {
      from: from,
      to: recipientEmail,
      subject: `Your VerifyHub Email System is Working 🎉`,
      headers: headers,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #1a365d;">
            <h1 style="color: #1a365d; margin-bottom: 5px; font-size: 24px;">Email Test Successful! 🎉</h1>
            <p style="color: #4a5568; font-size: 16px;">Your email configuration is working correctly</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin-bottom: 10px; font-size: 16px;">Hello,</p>
            <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">This is a test email from <strong>VerifyHub</strong> to confirm that your email configuration is properly set up and functioning.</p>
            <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">You can now use the email functionality to send certificates to recipients.</p>
            <p style="margin-bottom: 15px; line-height: 1.5; font-size: 16px;">If you received this in your spam folder, please mark it as "Not Spam" to ensure future delivery to your inbox.</p>
          </div>
          
          <div style="background-color: #e6f7ff; color: #003a8c; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #1890ff;">
            <p style="margin: 0; line-height: 1.5; font-size: 16px;">This email was sent as part of system testing. No action is required from your side.</p>
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; color: #718096; font-size: 14px; text-align: center;">
            <p style="margin-bottom: 10px;">© ${new Date().getFullYear()} VerifyHub - Certificate Verification System</p>
            <p style="margin-bottom: 5px; line-height: 1.5;">If you didn't request this test, please ignore this email or contact support.</p>
            <p style="margin-bottom: 5px; line-height: 1.5;">Best regards,</p>
            <p style="font-weight: bold;">The VerifyHub Team</p>
          </div>
        </div>
      `,
      text: `
Email Test Successful!
Your email configuration is working correctly

Hello,

This is a test email from VerifyHub to confirm that your email configuration is properly set up and functioning.

You can now use the email functionality to send certificates to recipients.

If you received this in your spam folder, please mark it as "Not Spam" to ensure future delivery to your inbox.

This email was sent as part of system testing. No action is required from your side.

© ${new Date().getFullYear()} VerifyHub - Certificate Verification System

If you didn't request this test, please ignore this email or contact support.

Best regards,
The VerifyHub Team
      `, // Plain text version for better deliverability
    };

    // Send email
    console.log('Sending test email...');
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Test email sent successfully to ${recipientEmail}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (sendError) {
      console.error('Error during sendMail operation:', sendError);

      // Gmail-specific error handling for sending errors
      if (sendError.message.includes('5.7.0') || sendError.message.includes('less secure app')) {
        return {
          success: false,
          error: `Gmail security error: ${sendError.message}. Please enable "Less secure apps" or use an App Password.`
        };
      }

      throw sendError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get the application base URL from environment variables or configuration
 * This avoids dependency on req object for background processes
 * 
 * @returns {string} Base URL for the application
 */
export const getAppBaseUrl = () => {
  // Priority: 1. APP_BASE_URL env var, 2. Constructed from protocol and host, 3. Default
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  const protocol = process.env.APP_PROTOCOL || 'http';
  const host = process.env.APP_HOST || 'localhost:3000';
  return `${protocol}://${host}`;
};

/**
 * Send certificate via email
 * @param {string} recipientEmail - Email address of the recipient
 * @param {string} candidateName - Name of the certificate recipient
 * @param {string} courseName - Name of the course
 * @param {string} certificateLink - Link to download or view the certificate
 * @param {string} verificationLink - Link to verify the certificate
 * @param {Object} additionalInfo - Additional certificate information (optional)
 * @returns {Promise<Object>} - Result of the email sending operation
 */
export const sendCertificateEmail = async (
  recipientEmail,
  candidateName,
  courseName,
  certificateLink,
  verificationLink,
  additionalInfo = {}
) => {
  try {
    // Check if email configuration is missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env file.');
      return {
        success: false,
        error: 'Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env file.'
      };
    }

    // Check if password is empty
    if (process.env.EMAIL_PASSWORD.trim() === '') {
      console.warn('EMAIL_PASSWORD environment variable is empty');
      return {
        success: false,
        error: 'EMAIL_PASSWORD is not set properly in the .env file'
      };
    }

    const transporter = createTransporter();

    // Verify SMTP connection configuration
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP connection verification failed:', verifyError);
      return {
        success: false,
        error: `SMTP connection failed: ${verifyError.message}`
      };
    }

    // Extract additional info with defaults
    const {
      institutionName = '',
      certificateId = '',
      issuedDate = new Date().toLocaleDateString(),
      expiryDate = '',
      certificateType = 'ACHIEVEMENT',
      verificationCode = ''
    } = additionalInfo;

    // Format the certificate type for display
    const formattedCertType = certificateType ?
      certificateType.charAt(0).toUpperCase() + certificateType.slice(1).toLowerCase() :
      'Achievement';

    // Format issued date
    const formattedDate = new Date(issuedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format expiry date if provided
    const formattedExpiry = expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null;

    const from = `"VerifyHub Certificates" <${process.env.EMAIL_USER}>`;

    // Add anti-spam headers
    const headers = generateDeliverabilityHeaders(process.env.EMAIL_USER, recipientEmail);

    // Prepare email content
    const mailOptions = {
      from: from,
      to: recipientEmail,
      subject: `Your ${courseName} Certificate is Ready 🎓`,
      headers: headers,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <!-- Header with Logo -->
          <div style="background-color: #1a365d; padding: 25px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">VerifyHub</h1>
            <p style="color: #e2e8f0; margin-top: 5px; font-size: 16px;">Blockchain-Verified Certificates</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="color: #2d3748; margin-bottom: 8px; font-size: 24px;">Your Certificate is Ready!</h2>
              <p style="color: #4a5568; font-size: 16px; margin-top: 0;">Congratulations on your achievement</p>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="margin-bottom: 15px; line-height: 1.6; font-size: 16px; color: #2d3748;">Hello <strong>${candidateName}</strong>,</p>
              <p style="margin-bottom: 15px; line-height: 1.6; font-size: 16px; color: #2d3748;">Congratulations on successfully completing <strong>${courseName}</strong>! Your certificate has been generated and is now available.</p>
              <p style="margin-bottom: 20px; line-height: 1.6; font-size: 16px; color: #2d3748;">This certificate is securely stored on the blockchain, ensuring its authenticity and tamper-proof status.</p>
            </div>
            
            <!-- Certificate Details Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #1a365d; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Certificate Details</h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #4a5568;">
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Certificate ID:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${certificateId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Recipient:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${candidateName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Course/Program:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${courseName}</td>
                </tr>
                ${institutionName ? `
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Issuing Institution:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${institutionName}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Certificate Type:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${formattedCertType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Date Issued:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${formattedDate}</td>
                </tr>
                ${formattedExpiry ? `
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Valid Until:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${formattedExpiry}</td>
                </tr>` : ''}
                ${verificationCode ? `
                <tr>
                  <td style="padding: 8px 5px; width: 40%; vertical-align: top;"><strong>Verification Code:</strong></td>
                  <td style="padding: 8px 5px; width: 60%; vertical-align: top;">${verificationCode}</td>
                </tr>` : ''}
              </table>
            </div>
            
            <!-- Action Buttons -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${certificateLink}" style="display: inline-block; background-color: #1a365d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 8px 12px 8px; font-size: 16px;">Download Certificate</a>
              <a href="${verificationLink}" style="display: inline-block; background-color: #4a5568; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 8px 12px 8px; font-size: 16px;">Verify Certificate</a>
            </div>
            
            <!-- Tip Box -->
            <div style="background-color: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; border-radius: 5px; margin-bottom: 25px;">
              <p style="margin: 0; line-height: 1.6; font-size: 15px; color: #0c5460;">
                <strong>💡 Tip:</strong> Your certificate includes a unique blockchain signature that proves its authenticity. This makes it easier to share with employers or educational institutions.
              </p>
          </div>
          
            <p style="margin-bottom: 20px; line-height: 1.6; font-size: 16px; color: #2d3748;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p style="margin-bottom: 5px; line-height: 1.6; font-size: 16px; color: #2d3748;">Best regards,</p>
            <p style="font-weight: bold; font-size: 16px; color: #2d3748;">The VerifyHub Team</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="margin-bottom: 10px;">© ${new Date().getFullYear()} VerifyHub - Blockchain Certificate Verification System</p>
            <p style="margin-bottom: 5px;">This certificate is secured by blockchain technology, ensuring its authenticity and immutability.</p>
            <p style="margin: 15px 0 5px 0;">
              <a href="${verificationLink}" style="color: #4299e1; text-decoration: underline; margin: 0 10px;">Verify Certificate</a>
              <a href="#" style="color: #4299e1; text-decoration: underline; margin: 0 10px;">Help Center</a>
              <a href="#" style="color: #4299e1; text-decoration: underline; margin: 0 10px;">Contact Support</a>
            </p>
          </div>
        </div>
      `,
      text: `
VERIFYHUB CERTIFICATE
--------------------

Your ${courseName} Certificate is Ready!
Congratulations on your achievement

Hello ${candidateName},

Congratulations on successfully completing ${courseName}! Your certificate has been generated and is now available.

This certificate is securely stored on the blockchain, ensuring its authenticity and tamper-proof status.

CERTIFICATE DETAILS:
- Certificate ID: ${certificateId}
- Recipient: ${candidateName}
- Course/Program: ${courseName}
${institutionName ? `- Issuing Institution: ${institutionName}\n` : ''}
- Certificate Type: ${formattedCertType}
- Date Issued: ${formattedDate}
${formattedExpiry ? `- Valid Until: ${formattedExpiry}\n` : ''}
${verificationCode ? `- Verification Code: ${verificationCode}\n` : ''}

To download your certificate, visit: ${certificateLink}
To verify your certificate, visit: ${verificationLink}

TIP: Your certificate includes a unique blockchain signature that proves its authenticity. This makes it easier to share with employers or educational institutions.

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The VerifyHub Team

© ${new Date().getFullYear()} VerifyHub - Blockchain Certificate Verification System
This certificate is secured by blockchain technology, ensuring its authenticity and immutability.
      `, // Plain text version for better deliverability
    };

    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Certificate email sent to ${recipientEmail}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (sendError) {
      console.error('Error during sendMail operation:', sendError);

      if (sendError.message.includes('5.7.0') || sendError.message.includes('less secure app')) {
        return {
          success: false,
          error: `Gmail security error: ${sendError.message}. Please enable "Less secure apps" or use an App Password.`
        };
      }

      throw sendError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Error sending certificate email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send certificate confirmation emails for newly confirmed certificates
 * 
 * @param {Array} certificates - Array of certificate documents that have been confirmed but have not had emails sent
 * @returns {Promise<Object>} - Results of email sending operations
 */
export const sendConfirmedCertificateEmails = async (certificates) => {
  if (!Array.isArray(certificates) || certificates.length === 0) {
    console.log('No certificates to send confirmation emails for');
    return { sent: 0, failed: 0, skipped: 0 };
  }

  console.log(`Preparing to send ${certificates.length} confirmation emails`);

  // Track results
  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  // Get base URL from configuration, not from req
  const baseUrl = getAppBaseUrl().replace(':3000', ':5173');

  // Process each certificate
  for (const cert of certificates) {
    try {
      // Skip if no recipient email is provided
      if (!cert.recipientEmail) {
        console.log(`Certificate ${cert.certificateId} has no recipient email, skipping`);
        results.skipped++;
        results.details.push({
          certificateId: cert.certificateId,
          status: 'skipped',
          reason: 'no_email'
        });
        continue;
      }

      // Create verification URL
      const verificationCode = cert.verificationCode || '';
      const verificationUrl = `${baseUrl}/verify?code=${verificationCode}&auto=true`;

      // Generate IPFS gateway URL for the certificate
      const certificateLink = `${process.env.PINATA_GATEWAY_BASE_URL || 'https://gateway.pinata.cloud/ipfs'}/${cert.ipfsHash}`;

      // Prepare additional certificate information
      const additionalInfo = {
        certificateId: cert.certificateId,
        institutionName: cert.institutionName,
        issuedDate: cert.issuedDate,
        expiryDate: cert.validUntil,
        certificateType: cert.certificateType || 'ACHIEVEMENT',
        verificationCode: cert.verificationCode
      };

      // Send the confirmation email
      const emailResult = await sendCertificateEmail(
        cert.recipientEmail,
        cert.candidateName,
        cert.courseName,
        certificateLink,
        verificationUrl,
        additionalInfo
      );

      if (emailResult.success) {
        console.log(`✅ Confirmation email sent for certificate ${cert.certificateId} to ${cert.recipientEmail}`);
        results.sent++;
        results.details.push({
          certificateId: cert.certificateId,
          status: 'sent',
          messageId: emailResult.messageId
        });
      } else {
        console.error(`❌ Failed to send confirmation email for certificate ${cert.certificateId}: ${emailResult.error}`);
        results.failed++;
        results.details.push({
          certificateId: cert.certificateId,
          status: 'failed',
          error: emailResult.error
        });
      }
    } catch (error) {
      console.error(`❌ Error processing certificate email for ${cert.certificateId}:`, error);
      results.failed++;
      results.details.push({
        certificateId: cert.certificateId,
        status: 'error',
        error: error.message
      });
    }
  }

  console.log(`📧 Email sending complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);
  return results;
};

export default {
  sendCertificateEmail,
  testEmailSending,
  sendConfirmedCertificateEmails
}; 