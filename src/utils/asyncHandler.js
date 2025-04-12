/**
 * Async handler to simplify error handling in Express route handlers
 * 
 * @param {Function} fn - Async function to be wrapped
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 