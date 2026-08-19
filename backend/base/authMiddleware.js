const jwt = require('jsonwebtoken');
const BaseRepository = require('./baseRepository');
const RbacService = require('../features/rbac/rbacService');

// Instantiate RbacService
const rbacService = new RbacService(new BaseRepository());

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).json({ success: false, error: 'A token is required for authentication' });
  }

  try {
    const tokenPart = token.split(' ').pop();
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(tokenPart, secret);
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid Token' });
  }
  return next();
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.uuid) {
      return res.status(403).json({ success: false, error: 'Forbidden: No valid user loaded' });
    }

    try {
      // Get effective permissions dynamically (checks Redis first, falls back to DB)
      const permissions = await rbacService.getEffectivePermissions(req.user.uuid);

      if (!permissions || permissions.length === 0) {
        return res.status(403).json({ success: false, error: 'Forbidden: No permissions loaded' });
      }
      
      if (!permissions.includes(permission)) {
        return res.status(403).json({ success: false, error: `Forbidden: Missing required permission '${permission}'` });
      }
      
      // Update req.user.permissions for downstream use just in case
      req.user.permissions = permissions;
      
      return next();
    } catch (err) {
      console.error('[authMiddleware] Permission check failed:', err.message);
      return res.status(500).json({ success: false, error: 'Internal Server Error during authorization' });
    }
  };
};

module.exports = { verifyToken, requirePermission };
