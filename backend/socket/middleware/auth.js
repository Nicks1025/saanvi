const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
  const tokenHeader = socket.handshake.auth.token;
  if (!tokenHeader) {
    return next(new Error('AUTHENTICATION_REQUIRED'));
  }

  try {
    const tokenPart = tokenHeader.split(' ').pop();
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(tokenPart, secret);
    
    // Validate UUID structure (basic safeguard)
    if (!decoded.uuid) {
      return next(new Error('NOT_AUTHORIZED'));
    }

    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('NOT_AUTHORIZED'));
  }
};
