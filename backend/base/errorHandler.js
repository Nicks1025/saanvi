/**
 * Centralized Express Error Handler
 *
 * Ensures all unhandled errors across routes, middleware, and controllers follow the canonical
 * error envelope: { success: false, data: null, error: { code, message, details } }
 * Never leaks database error codes, SQL strings, stack traces, or internal server details on 500 errors.
 */
function errorHandler(err, req, res, next) {
  const statusCode = typeof err.statusCode === 'number' 
    ? err.statusCode 
    : (typeof err.status === 'number' ? err.status : 500);

  if (statusCode >= 500) {
    console.error(`[Centralized Server Error] [${req.method || 'UNKNOWN'} ${req.originalUrl || req.url || '/'}]`, {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
  }

  const isClientSafe = statusCode < 500;
  const publicMessage = isClientSafe ? (err.message || 'Client Error') : 'Internal Server Error';
  const publicCode = err.code && isClientSafe ? err.code : (
    statusCode === 400 ? 'VALIDATION_ERROR' :
    statusCode === 401 ? 'UNAUTHORIZED' :
    statusCode === 403 ? 'FORBIDDEN' :
    statusCode === 404 ? 'NOT_FOUND' :
    statusCode === 409 ? 'CONFLICT' :
    'SERVER_ERROR'
  );

  const publicDetails = Array.isArray(err.details) ? err.details : [];

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: publicCode,
      message: publicMessage,
      details: publicDetails
    }
  });
}

module.exports = errorHandler;
