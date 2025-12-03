// src/components/ProtectedRoute.jsx
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiX, FiLock, FiArrowRight, FiAlertCircle } from 'react-icons/fi';

/**
 * ProtectedRoute component
 * 
 * This component handles routes that require authentication or specific roles.
 * It can restrict access based on user roles and show appropriate messages.
 * 
 * @param {Object} props
 * @param {Array<string>} [props.allowedRoles] - Optional array of roles that can access this route
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  // Check if user exists and has the required role if specified
  const hasAccess = user && (!allowedRoles || allowedRoles.includes(user.role));

  // If user is not authenticated, show login prompt
  if (!user) {
    return (
      <div className="relative">
        {/* Login Prompt Modal */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-6 max-w-md w-full mx-4 shadow-md transform transition-all">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-sm">
                  <FiLock className="h-5 w-5 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Authentication Required</h3>
              </div>
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-500 transition-colors p-1 hover:bg-gray-100 rounded-sm"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-5 text-sm leading-relaxed">
              To access this feature, please sign in to your account or create a new one. This helps us maintain security and provide you with a personalized experience.
            </p>

            <div className="flex flex-col space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-gray-800 text-white rounded-sm text-sm font-medium hover:bg-gray-700 transition-colors group"
              >
                <span>Continue to Login</span>
                <FiArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated but doesn't have the required role
  if (!hasAccess) {
    return (
      <div className="relative">
        {/* Unauthorized Access Modal */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-6 max-w-md w-full mx-4 shadow-md transform transition-all">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 rounded-sm">
                  <FiAlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
              </div>
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-500 transition-colors p-1 hover:bg-gray-100 rounded-sm"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-5 text-sm leading-relaxed">
              Sorry, you don't have permission to access this page. This feature is only available to users with {allowedRoles?.join(' or ')} role.
            </p>

            <div className="flex flex-col space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-gray-800 text-white rounded-sm text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated and has required role, render the protected route
  return <Outlet />;
}