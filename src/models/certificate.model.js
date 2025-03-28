// src/models/certificate.model.js
import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    uid: { type: String, required: true },
    candidateName: { type: String, required: true },
    courseName: { type: String, required: true },
    orgName: { type: String, required: true },
    ipfsHash: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Certificate', CertificateSchema);
