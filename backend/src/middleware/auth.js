const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`Invalid token: ${err.message}`);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
