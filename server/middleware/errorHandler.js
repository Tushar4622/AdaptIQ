const { logSecurityEvent } = require('../services/securityLogger');

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `A record with this ${field} already exists.`;
    statusCode = 409;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((e) => e.message).join(', ');
    statusCode = 422;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  if (Number(err.retryAfterSeconds) > 0) {
    res.setHeader('Retry-After', String(Math.ceil(err.retryAfterSeconds)));
  }

  logSecurityEvent('request.error', req, {
    statusCode,
    errorType: typeof err.name === 'string' ? err.name : 'Error',
  });

  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({ error: message, stack: err.stack });
  }

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
