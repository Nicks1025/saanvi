const jwt = require('jsonwebtoken');

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
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ success: false, error: 'Forbidden: No permissions loaded' });
    }
    
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ success: false, error: `Forbidden: Missing required permission '${permission}'` });
    }
    
    return next();
  };
};

module.exports = { verifyToken, requirePermission };
