import React from 'react';
import {
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiHash,
  FiFileText,
  FiLink,
  FiInfo,
  FiDownload,
  FiCheckCircle,
  FiCalendar
} from 'react-icons/fi';

const CertificateSuccessView = ({ certificateData, copiedField, onCopy, onReset, formData, mode = 'generated', status = 'PENDING' }) => {
  if (!certificateData) return null;

  // Status badge component
  const StatusBadge = () => {
    const statusConfig = {
      PENDING: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏳',
        text: 'Pending Confirmation'
      },
      CONFIRMED: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅',
        text: 'Confirmed on Blockchain'
      },
      FAILED: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌',
        text: 'Confirmation Failed'
      }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color} text-sm font-medium`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </div>
    );
  };

  const HashField = ({ label, value, fieldName, className = "" }) => {
    if (!value) return null;

    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
          <span className="text-xs text-gray-400">Click to copy</span>
        </div>
        <button
          onClick={() => onCopy(value, fieldName)}
          className="w-full text-left bg-gray-50 border border-gray-200 rounded-sm p-2 overflow-x-auto relative hover:bg-gray-100 transition-all focus:outline-none focus:ring-1 focus:ring-gray-400 group"
          aria-label={`Copy ${label}`}
        >
          <code className="text-sm text-gray-800 break-all font-mono pr-8">{value}</code>
          <span className="absolute right-2 top-2">
            {copiedField === fieldName ?
              <FiCheck className="w-4 h-4 text-green-600" /> :
              <FiCopy className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
            }
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 rounded-sm relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <StatusBadge />
        </div>
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M30,30 L70,30 L70,70 L30,70 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-green-500/20 p-3 rounded-full border border-green-500/30">
            <FiCheck className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">
              {mode === 'generated' ? 'Certificate Generated Successfully' : 'Certificate Verified Successfully'}
            </h3>
            <p className="text-gray-300 text-sm">
              {mode === 'generated' ? 'Your certificate has been generated and stored on the blockchain.' : 'This certificate has been validated and is authentic.'}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Code */}
      {(certificateData.shortCode || certificateData.verificationCode) && (
        <div className="bg-white border border-gray-200 p-5 rounded-sm">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Verification Code</h4>
              <div className="flex items-center">
                <button
                  onClick={() => onCopy(certificateData.verificationCode || certificateData.shortCode, 'verificationCode')}
                  className="bg-gray-900 text-white px-6 py-2.5 rounded-sm font-mono text-2xl tracking-wider hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 group transition-all"
                >
                  {certificateData.verificationCode || certificateData.shortCode}
                  <span className="ml-3 opacity-60 group-hover:opacity-100 transition-opacity inline-flex items-center">
                    {copiedField === 'verificationCode' || copiedField === 'shortCode' ?
                      <FiCheckCircle className="w-5 h-5 text-green-400" /> :
                      <FiCopy className="w-5 h-5" />
                    }
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use this code to quickly verify this certificate
              </p>
            </div>

            {(certificateData._links?.pdf || certificateData.ipfsGateway) && (
              <a
                href={certificateData._links?.pdf || certificateData.ipfsGateway}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <FiDownload className="w-5 h-5 mr-2" />
                Download Certificate
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column - Certificate Details */}
        <div className="bg-white border border-gray-200 rounded-sm p-5">
          <div className="flex items-center border-b border-gray-200 pb-3 mb-4">
            <div className="bg-gray-100 p-2 rounded-full mr-3">
              <FiInfo className="w-5 h-5 text-gray-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Certificate Details</h4>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                {certificateData.certificate?.uid && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unique ID</label>
                    <p className="font-medium text-gray-900">{certificateData.certificate.uid}</p>
                  </div>
                )}
                {(certificateData.certificate?.candidateName || formData?.candidateName) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Candidate</label>
                    <p className="font-medium text-gray-900">
                      {certificateData.certificate?.candidateName || formData?.candidateName}
                    </p>
                  </div>
                )}
                {(certificateData.certificate?.courseName || formData?.courseName) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
                    <p className="font-medium text-gray-900">
                      {certificateData.certificate?.courseName || formData?.courseName}
                    </p>
                  </div>
                )}
                {(certificateData.certificate?.orgName || formData?.orgName) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Organization</label>
                    <p className="font-medium text-gray-900">
                      {certificateData.certificate?.orgName || formData?.orgName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate ID with special styling */}
            {certificateData.certificateId && (
              <div className="bg-gray-900 text-white p-4 rounded-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Certificate ID</span>
                  <span className="text-xs text-gray-500">Click to copy</span>
                </div>
                <button
                  className="w-full text-left bg-gray-800 rounded-sm p-2.5 relative hover:bg-gray-700 transition-all focus:outline-none focus:ring-1 focus:ring-gray-600 group"
                  onClick={() => onCopy(certificateData.certificateId, 'certificateId')}
                >
                  <code className="text-sm break-all font-mono pr-6 text-gray-300">
                    {certificateData.certificateId}
                  </code>
                  <span className="absolute right-2 top-2">
                    {copiedField === 'certificateId' ?
                      <FiCheckCircle className="w-4 h-4 text-green-400" /> :
                      <FiCopy className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                    }
                  </span>
                </button>
              </div>
            )}

            {/* Date Information */}
            {(certificateData.certificate?.timestamp || certificateData.certificate?.issuedAt) && (
              <div className="flex items-center p-3 bg-gray-50 rounded-sm border border-gray-200">
                <FiCalendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Issue Date</label>
                  <p className="font-medium text-gray-900">
                    {certificateData.certificate.issuedAt ?
                      new Date(certificateData.certificate.issuedAt).toLocaleString() :
                      new Date(parseInt(certificateData.certificate.timestamp) * 1000).toLocaleString()
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Blockchain & Hash Data */}
        <div className="bg-white border border-gray-200 rounded-sm p-5">
          <div className="flex items-center border-b border-gray-200 pb-3 mb-4">
            <div className="bg-gray-100 p-2 rounded-full mr-3">
              <FiHash className="w-5 h-5 text-gray-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Blockchain Data</h4>
          </div>

          <div className="space-y-4">
            {/* Transaction Hash */}
            {certificateData.transaction?.hash && (
              <HashField
                label="Transaction Hash"
                value={certificateData.transaction.hash}
                fieldName="txHash"
              />
            )}

            {/* IPFS Hash */}
            {(certificateData.computedHashes?.ipfsHash || certificateData.certificate?.ipfsHash) && (
              <HashField
                label="IPFS Hash"
                value={certificateData.computedHashes?.ipfsHash || certificateData.certificate?.ipfsHash}
                fieldName="ipfsHash"
              />
            )}

            {/* SHA256 Hash */}
            {certificateData.computedHashes?.sha256Hash && (
              <HashField
                label="SHA-256 Hash"
                value={certificateData.computedHashes.sha256Hash}
                fieldName="sha256Hash"
              />
            )}
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex flex-wrap gap-3">
        {certificateData._links?.blockchain && (
          <a
            href={certificateData._links.blockchain}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <FiExternalLink className="w-5 h-5 mr-2" />
            View on Blockchain
          </a>
        )}

        {(certificateData.computedHashes?.ipfsHash || certificateData.certificate?.ipfsHash) && (
          <a
            href={`https://ipfs.io/ipfs/${certificateData.computedHashes?.ipfsHash || certificateData.certificate?.ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-900 rounded-sm hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 border border-gray-300"
          >
            <FiExternalLink className="w-5 h-5 mr-2" />
            View on IPFS
          </a>
        )}

        <button
          onClick={onReset}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          {mode === 'generated' ? (
            <>
              <FiFileText className="w-5 h-5 mr-2" />
              Generate Another
            </>
          ) : (
            <>
              <FiCheck className="w-5 h-5 mr-2" />
              Verify Another
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CertificateSuccessView;