import React, { useState, useRef } from 'react';
import { FiUpload, FiImage, FiCheck, FiX } from 'react-icons/fi';
import axios from 'axios';

const LogoUpload = ({ currentLogo, onLogoUpdated }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentLogo);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      const formData = new FormData();
      formData.append('logo', file);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/api/users/profile/logo`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSuccess('Logo uploaded successfully!');
        setPreview(response.data.data.institutionLogo);
        if (onLogoUpdated) {
          onLogoUpdated(response.data.data.institutionLogo);
        }
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload logo');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiImage className="w-5 h-5" />
        Institution Logo
      </h3>

      <div className="space-y-4">
        {/* Logo Preview */}
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 border-2 border-gray-200 rounded-sm overflow-hidden bg-gray-50 flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Institution Logo" className="w-full h-full object-contain" />
            ) : (
              <FiImage className="w-12 h-12 text-gray-400" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">
              Upload your institution's logo. This will appear on all certificates you issue.
            </p>
            <p className="text-xs text-gray-500">
              Recommended: Square image, PNG or JPG, max 5MB
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FiUpload className="w-4 h-4" />
                Upload Logo
              </>
            )}
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-sm p-3">
            <FiCheck className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-sm p-3">
            <FiX className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoUpload;
