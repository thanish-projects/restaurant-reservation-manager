const winston = require('winston');

const isTest = process.env.NODE_ENV === 'test';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new winston.transports.Console({ silent: isTest }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', silent: isTest }),
    new winston.transports.File({ filename: 'logs/combined.log', silent: isTest }),
  ],
});

module.exports = logger;
