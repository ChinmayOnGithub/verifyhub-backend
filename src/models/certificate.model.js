// src/models/Certificate.js
const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true,
  },
  uid: { type: String, required: true },
  candidateName: { type: String, required: true },
  courseName: { type: String, required: true },
  orgName: { type: String, required: true },
  ipfsHash: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
