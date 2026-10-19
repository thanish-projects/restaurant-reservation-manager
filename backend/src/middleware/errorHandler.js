const logger = require('../config/logger');

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);

  // Postgres & MySQL duplicate key error codes
  if (err.code === '23505' || err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return res.status(409).json({ message: 'A record with this value already exists' });
  }

  // Postgres & MySQL foreign key error codes
  if (
    err.code === '23503' ||
    err.code === 'ER_NO_REFERENCED_ROW_2' ||
    err.code === 'ER_NO_REFERENCED_ROW' ||
    err.code === 'ER_ROW_IS_REFERENCED_2' ||
    err.errno === 1452 ||
    err.errno === 1451
  ) {
    return res.status(400).json({ message: 'Referenced record does not exist' });
  }

  const status = err.status || 500;
  let message = err.message;
  if (status === 500) {
    message = 'Internal server error';
  }
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
