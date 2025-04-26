// src/models/certificate.model.js
import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    verificationCode: { type: String, required: true, unique: true, uppercase: true },
    institutionalSignature: { type: String },
    referenceId: { type: String, required: true },
    candidateName: { type: String, required: true },
    courseName: { type: String, required: true },
    institutionName: { type: String, required: true },
    issuedDate: { type: Date },
    validUntil: { type: Date },
    institutionLogo: { type: String },
    generationDate: { type: Date, default: Date.now },
    blockchainTxId: { type: String },
    cryptographicSignature: { type: String },
    issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientEmail: { type: String },
    ipfsHash: { type: String, required: true },
    sha256Hash: { type: String },
    cidHash: { type: String },
    blockchainTx: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'PENDING'
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: { type: Date },
    source: {
      type: String,
      enum: ['internal', 'external'],
      default: 'internal'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    indexes: [
      { certificateId: 1 },
      { verificationCode: 1 },
      { ipfsHash: 1 },
      { sha256Hash: 1 },
      { cidHash: 1 },
      { blockchainTx: 1 },
      { candidateName: 1 },
      { institutionName: 1 },
      { issuer: 1 },
      { issuedDate: 1 },
      { blockchainTxId: 1 },
      { recipientEmail: 1 }
    ]
  }
);

// Add a method to check if a certificate exists by hash
CertificateSchema.statics.findByHash = function (ipfsHash) {
  return this.findOne({ ipfsHash });
};

// Add a method to check if a certificate exists by SHA-256 hash
CertificateSchema.statics.findBySha256Hash = function (sha256Hash) {
  return this.findOne({ sha256Hash });
};

// Add a method to check if a certificate exists by CID hash
CertificateSchema.statics.findByCidHash = function (cidHash) {
  return this.findOne({ cidHash });
};

// Add a method to check if a certificate exists by transaction hash
CertificateSchema.statics.findByTxHash = function (txHash) {
  return this.findOne({ blockchainTx: txHash });
};

export const Certificate = mongoose.model('Certificate', CertificateSchema);
export default Certificate;
