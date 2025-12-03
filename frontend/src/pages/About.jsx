import React from 'react';
import { FiServer, FiDatabase, FiLock, FiGithub, FiCode, FiLayers } from 'react-icons/fi';
import Header from '../components/Header';

function About() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* About Hero Section - Made smaller */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">About VerifyHub</h1>
          <p className="text-base text-gray-700">
            A certificate verification platform built with advanced backend technologies.
          </p>
        </div>

        {/* Technical Architecture - More compact */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Technical Architecture</h2>
          <div className="bg-white p-4 rounded-sm border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Architecture cards - Made more compact */}
              <div className="bg-gray-50 border border-gray-300 rounded-sm p-4 flex flex-col items-center text-center transition-colors duration-200 hover:bg-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <FiLayers className="w-5 h-5 text-gray-700" />
                </div>
                <h4 className="text-base font-medium text-gray-900 mb-1">Frontend Layer</h4>
                <p className="text-sm text-gray-700">React & Tailwind</p>
              </div>
              <div className="bg-gray-50 border border-gray-300 rounded-sm p-4 flex flex-col items-center text-center transition-colors duration-200 hover:bg-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <FiServer className="w-5 h-5 text-gray-700" />
                </div>
                <h4 className="text-base font-medium text-gray-900 mb-1">API Layer</h4>
                <p className="text-sm text-gray-700">Node.js & Express</p>
              </div>
              <div className="bg-gray-50 border border-gray-300 rounded-sm p-4 flex flex-col items-center text-center transition-colors duration-200 hover:bg-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <FiDatabase className="w-5 h-5 text-gray-700" />
                </div>
                <h4 className="text-base font-medium text-gray-900 mb-1">Data Layer</h4>
                <p className="text-sm text-gray-700">MongoDB & Blockchain</p>
              </div>
            </div>
          </div>
        </div>

        {/* Development Process - More compact */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Development Approach</h2>
          <div className="bg-white border border-gray-300 rounded-sm p-4">
            <p className="text-sm text-gray-700 mb-4">
              Our development process emphasizes robust backend architecture and security:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 border border-gray-300 rounded-sm hover:bg-gray-100 transition-colors duration-200">
                <p className="font-medium text-base text-gray-900 mb-2">Design Phase</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>API schema planning</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Database architecture</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Security model design</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-300 rounded-sm hover:bg-gray-100 transition-colors duration-200">
                <p className="font-medium text-base text-gray-900 mb-2">Implementation</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>TDD approach for backend</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Modular architecture</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Continuous integration</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-300 rounded-sm hover:bg-gray-100 transition-colors duration-200">
                <p className="font-medium text-base text-gray-900 mb-2">Quality Assurance</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Comprehensive API testing</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Security vulnerability scanning</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-gray-700 text-xs">•</span>
                    </div>
                    <span>Performance optimization</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Open Source - More compact */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Open Source</h2>
          <div className="bg-white border border-gray-300 rounded-sm p-4 flex flex-col md:flex-row items-center justify-between hover:bg-gray-50 transition-colors duration-200">
            <p className="text-sm text-gray-700 mb-4 md:mb-0 md:mr-4">
              Our code is open source and available for review, contribution, and educational purposes.
            </p>
            <a
              href="https://github.com/verifyhub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-sm text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <FiGithub className="mr-2" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Footer - More subtle */}
      <div className="bg-gray-100 py-4 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>© 2025 VerifyHub</p>
        </div>
      </div>
    </div>
  );
}

export default About;