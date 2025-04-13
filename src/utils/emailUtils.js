import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send certificate via email
 * @param {string} recipientEmail - Email address of the recipient
 * @param {string} candidateName - Name of the certificate recipient
 * @param {string} courseName - Name of the course
 * @param {string} certificateLink - Link to download or view the certificate
 * @param {string} verificationLink - Link to verify the certificate
 * @returns {Promise<Object>} - Result of the email sending operation
 */
export const sendCertificateEmail = async (
  recipientEmail,
  candidateName,
  courseName,
  certificateLink,
  verificationLink
) => {
  try {
    // Check if email configuration is missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env file.');
      return {
        success: false,
        error: 'Email configuration missing'
      };
    }

    const transporter = createTransporter();

    // Verify SMTP connection configuration
    await transporter.verify();

    // Prepare email content
    const mailOptions = {
      from: `"VerifyHub" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `Your Certificate for ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a365d; margin-bottom: 5px;">Your Certificate is Ready!</h1>
            <p style="color: #4a5568; font-size: 16px;">Congratulations on your achievement</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin-bottom: 10px;">Hello <strong>${candidateName}</strong>,</p>
            <p style="margin-bottom: 15px;">Congratulations on successfully completing <strong>${courseName}</strong>! Your certificate has been generated and is now available.</p>
            <p style="margin-bottom: 15px;">This certificate is securely stored on the blockchain, ensuring its authenticity and tamper-proof status.</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${certificateLink}" style="display: inline-block; background-color: #1a365d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-right: 10px;">View Certificate</a>
            <a href="${verificationLink}" style="display: inline-block; background-color: #4a5568; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Certificate</a>
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; color: #718096; font-size: 14px;">
            <p>If you have any questions, please contact support.</p>
            <p style="margin-bottom: 5px;">Best regards,</p>
            <p style="font-weight: bold;">The VerifyHub Team</p>
          </div>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Certificate email sent to ${recipientEmail}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending certificate email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  sendCertificateEmail
}; 