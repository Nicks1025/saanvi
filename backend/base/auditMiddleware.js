const QueryHelper = require('../database/queryHelper');

/**
 * Express middleware to audit log user actions.
 */
const auditMiddleware = (req, res, next) => {
  // We hook into the response finish event to capture the final request state and status code
  res.on('finish', async () => {
    const endpointPath = req.originalUrl.split('?')[0];

    // Skip logging noisy, unauthenticated system endpoints
    if (endpointPath.startsWith('/api/locales') || endpointPath.startsWith('/api/system/health')) {
      return;
    }

    const is_error = res.locals.is_error || (res.statusCode >= 400);
    const error_message = res.locals.error_message || null;
    
    // If no audit message is set, generate a default one
    const action = req.auditMessage || `${is_error ? 'Error on ' : ''}${req.method} ${endpointPath}`;
    
    // Try to get user info from decoded token
    const user_uuid = req.user && req.user.uuid ? req.user.uuid : null;
    const user_email = req.user && req.user.email ? req.user.email : null;
    const user_name = req.user && req.user.name ? req.user.name : null;

    // Mask sensitive payload info
    let payload = null;
    if (req.body && Object.keys(req.body).length > 0) {
      payload = { ...req.body };
      const sensitiveKeys = ['password', 'token', 'refreshToken', 'googleAccessToken'];
      for (const key of sensitiveKeys) {
        if (payload[key] !== undefined) {
          payload[key] = '***MASKED***';
        }
      }
    }

    const method = req.method;
    const endpoint = req.originalUrl.split('?')[0].substring(0, 255);
    const user_agent = req.headers['user-agent'] || '';
    const status_code = res.statusCode || 200;

    try {
      const qh = new QueryHelper();
      await qh.queryRaw(
        `INSERT INTO audit_logs (user_uuid, user_email, user_name, action, method, endpoint, payload, user_agent, is_error, error_message, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_uuid, 
          user_email,
          user_name,
          action, 
          method, 
          endpoint, 
          payload ? JSON.stringify(payload) : null, 
          user_agent,
          is_error,
          error_message,
          status_code
        ]
      );
    } catch (err) {
      console.error('[Audit Log Error]', err);
    }
  });

  next();
};

module.exports = auditMiddleware;
