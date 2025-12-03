import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiCheckSquare, FiUpload, FiArrowRight, FiShield, FiClock, FiKey, FiList } from 'react-icons/fi';
import Header from '../components/Header';

export default function Home() {
  const navigate = useNavigate();

  const mainActions = [
    {
      icon: FiFileText,
      title: 'Generate Certificate',
      description: 'Create new certificates with custom templates',
      action: () => navigate('/generate'),
    },
    {
      icon: FiCheckSquare,
      title: 'Verify Certificate',
      description: 'Check the authenticity of existing certificates',
      action: () => navigate('/verify'),
    },
    {
      icon: FiUpload,
      title: 'Upload PDF',
      description: 'Upload and manage PDF certificates',
      action: () => navigate('/upload'),
    },
    {
      icon: FiList,
      title: 'My Certificates',
      description: 'View certificates issued to your email address',
      action: () => navigate('/my-certificates'),
    }
  ];

  const benefits = [
    {
      icon: FiShield,
      title: 'Blockchain Security',
      description: 'Certificates are hashed and stored on the blockchain for tamper-proof verification',
    },
    {
      icon: FiClock,
      title: 'API-Driven Verification',
      description: 'Robust backend API with multiple verification endpoints and authentication',
    },
    {
      icon: FiKey,
      title: 'Advanced Verification Methods',
      description: 'Support for certificate IDs, short codes, and PDF hash verification',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      {/* <Header /> */}

      {/* Hero Section */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Secure Certificate Verification Platform
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
              VerifyHub uses blockchain technology and advanced backend systems to verify certificate authenticity.
            </p>
            <button
              onClick={() => navigate('/verify')}
              className="bg-gray-800 hover:bg-gray-600 text-white px-6 py-2 rounded-sm transition-colors"
            >
              Verify a Certificate
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Actions */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {mainActions.map((action, index) => (
              <div
                key={index}
                className="border border-gray-300 rounded-sm p-5 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                onClick={action.action}
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <action.icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-base">{action.title}</h3>
                </div>
                <p className="text-sm text-gray-700 mb-3">{action.description}</p>
                <button className="text-sm flex items-center text-gray-800 hover:text-black transition-colors">
                  <span className="mr-1">Try it</span>
                  <FiArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Highlights */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Technical Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-gray-100 p-5 rounded-sm hover:bg-gray-200 transition-colors duration-200">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 border border-gray-300">
                    <benefit.icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-base">{benefit.title}</h3>
                </div>
                <p className="text-sm text-gray-700">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Backend Architecture */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Powerful Backend Architecture</h2>
          <div className="bg-white border border-gray-300 rounded-sm p-5">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">RESTful API with comprehensive endpoints</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">MongoDB with optimized schema design</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">JWT authentication and role-based access</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">Rate limiting and security middleware</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">Blockchain integration for tamper-proof storage</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">PDF processing and hash verification</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">Comprehensive error handling</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-gray-700 text-xs">•</span>
                </div>
                <span className="text-base text-gray-700">Multiple verification algorithms</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Simple CTA */}
        <div className="bg-gray-100 p-6 rounded-sm text-center hover:bg-gray-200 transition-colors duration-200 border border-gray-300">
          <p className="text-gray-700 mb-4 text-base">
            Explore the robust verification capabilities powered by our advanced backend
          </p>
          <button
            onClick={() => navigate('/verify')}
            className="bg-gray-800 hover:bg-gray-600 text-white px-6 py-2.5 rounded-sm text-base transition-colors"
          >
            Try Certificate Verification
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-200 py-6 border-t border-gray-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-700">
          <p>© 2025 VerifyHub</p>
        </div>
      </div>
    </div>
  );
}