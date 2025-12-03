import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FiUpload, FiCheck, FiX, FiInfo, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import CertificateSuccessView from '../components/CertificateSuccessView';

const API_ENDPOINT = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/certificates/upload/external`;

const UploadPDF = () => {
  const { getToken } = useAuth();
  const [pdfFile, setPdfFile] = useState(null);
  const [formData, setFormData] = useState({
    candidateName: '',
    orgName: '',
    courseName: '',
    validUntil: '',
    certificateType: 'ACHIEVEMENT',
    recipientEmail: '',
    referenceId: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadData, setUploadData] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [copyError, setCopyError] = useState('');
  const fileInputRef = useRef(null);
  const copyNotificationRef = useRef(null);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;

    if (copyNotificationRef.current) {
      copyNotificationRef.current.style.opacity = '1';
      copyNotificationRef.current.style.transform = 'translateY(0)';
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedField(fieldName);
          setTimeout(() => {
            setCopiedField('');
            if (copyNotificationRef.current) {
              copyNotificationRef.current.style.opacity = '0';
              copyNotificationRef.current.style.transform = 'translateY(10px)';
            }
          }, 2000);
        })
        .catch(err => {
          setCopyError(`Couldn't copy to clipboard: ${err.message}`);
          setTimeout(() => setCopyError(''), 3000);
        });
    } else {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        setCopiedField(fieldName);
        setTimeout(() => {
          setCopiedField('');
          if (copyNotificationRef.current) {
            copyNotificationRef.current.style.opacity = '0';
            copyNotificationRef.current.style.transform = 'translateY(10px)';
          }
        }, 2000);
      } catch (err) {
        setCopyError(`Couldn't copy to clipboard: ${err.message}`);
        setTimeout(() => setCopyError(''), 3000);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formDataToSend = new FormData();
    formDataToSend.append('certificate', pdfFile);

    // Add all form fields to the request
    Object.entries(formData).forEach(([key, value]) => {
      if (value) { // Only append non-empty values
        formDataToSend.append(key, value);
      }
    });

    try {
      const token = getToken();
      const response = await axios.post(
        API_ENDPOINT,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Upload response:', response.data);
      setSuccess(true);
      setUploadData(response.data.data);
    } catch (err) {
      console.error('Upload error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPdfFile(null);
    setFormData({
      candidateName: '',
      orgName: '',
      courseName: '',
      validUntil: '',
      certificateType: 'ACHIEVEMENT',
      recipientEmail: '',
      referenceId: ''
    });
    setError('');
    setSuccess(false);
    setUploadData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div
        ref={copyNotificationRef}
        className="fixed top-4 right-4 bg-green-100 border border-green-200 text-green-800 px-4 py-2 rounded-sm shadow-md flex items-center transition-all duration-300 opacity-0 transform translate-y-10 z-50"
      >
        <FiCheckCircle className="w-5 h-5 mr-2 text-green-600" />
        <span>Copied to clipboard</span>
      </div>

      {copyError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-200 text-red-800 px-4 py-2 rounded-sm shadow-md flex items-center z-50">
          <FiAlertCircle className="w-5 h-5 mr-2 text-red-600" />
          <span>{copyError}</span>
        </div>
      )}

      <div className="flex-1 py-6 px-4 bg-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-sm shadow-sm border border-gray-300 p-5 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Upload External Certificate</h2>
            <p className="text-gray-600 mb-4">
              Upload a PDF certificate issued outside of VerifyHub to verify its authenticity on the blockchain.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm flex items-start">
                <FiX className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-white">
              {success && uploadData ? (
                <CertificateSuccessView
                  certificateData={uploadData}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                  onReset={resetForm}
                  formData={formData}
                  mode="uploaded"
                />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate PDF*
                    </label>
                    <div className="border-dashed border-2 border-gray-300 rounded-sm p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="application/pdf"
                        className="hidden"
                        id="pdfUpload"
                        ref={fileInputRef}
                      />
                      <label
                        htmlFor="pdfUpload"
                        className="cursor-pointer block mb-2"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FiUpload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {pdfFile ? pdfFile.name : 'Click to select a PDF certificate'}
                          </span>
                          <span className="text-xs text-gray-500">
                            PDF files only (max 10MB)
                          </span>
                        </div>
                      </label>
                      {pdfFile && (
                        <div className="mt-2 flex flex-col items-center">
                          <div className="flex items-center justify-center text-sm">
                            <FiInfo className="text-blue-500 mr-2" />
                            <span className="text-gray-900 font-medium">{pdfFile.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {(pdfFile.size / 1024).toFixed(2)} KB
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPdfFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="mt-2 text-xs text-red-600 hover:text-red-800 transition-colors"
                          >
                            Remove file
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Candidate Name*
                      </label>
                      <input
                        type="text"
                        name="candidateName"
                        value={formData.candidateName}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        placeholder="Enter recipient's name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name*
                      </label>
                      <input
                        type="text"
                        name="orgName"
                        value={formData.orgName}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        placeholder="Enter issuing organization name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course/Program Name
                      </label>
                      <input
                        type="text"
                        name="courseName"
                        value={formData.courseName}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        placeholder="Enter course or program name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference ID
                      </label>
                      <input
                        type="text"
                        name="referenceId"
                        value={formData.referenceId}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        placeholder="Enter custom reference ID (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Certificate Type
                      </label>
                      <select
                        name="certificateType"
                        value={formData.certificateType}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none bg-white"
                      >
                        <option value="ACHIEVEMENT">Achievement</option>
                        <option value="COMPLETION">Completion</option>
                        <option value="PARTICIPATION">Participation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valid Until
                      </label>
                      <input
                        type="date"
                        name="validUntil"
                        value={formData.validUntil}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        placeholder="Select expiration date (optional)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Email
                      </label>
                      <input
                        type="email"
                        name="recipientEmail"
                        value={formData.recipientEmail}
                        onChange={handleInputChange}
                        className="w-full p-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        placeholder="Enter recipient's email to send certificate (optional)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        If provided, the certificate will be emailed to the recipient.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-300">
                    <button
                      type="submit"
                      disabled={loading || !pdfFile}
                      className="w-full bg-gray-800 text-white px-6 py-3 rounded-sm
                        hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <FiUpload className="mr-2" />
                          Upload Certificate
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPDF;