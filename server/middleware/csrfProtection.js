const crypto = require('crypto');

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');

const getAllowedOrigins = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const isAllowedOrigin = (origin, allowedOrigins = getAllowedOrigins()) =>
  Boolean(origin && allowedOrigins.includes(normalizeOrigin(origin)));

const validateCsrfRequest = (req, allowedOrigins = getAllowedOrigins()) => {
  const origin = req.get('origin');
  if (!isAllowedOrigin(origin, allowedOrigins)) return false;

  const refreshCookie = req.cookies?.refreshToken;
  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.get('x-csrf-token');
  const isCookieAuthenticated = Boolean(refreshCookie || csrfCookie);

  if (!isCookieAuthenticated) {
    return Boolean(req.body?.refreshToken);
  }

  if (!csrfCookie || !csrfHeader) return false;
  const cookieBuffer = Buffer.from(csrfCookie);
  const headerBuffer = Buffer.from(csrfHeader);
  return (
    cookieBuffer.length === headerBuffer.length &&
    crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  );
};

const createCsrfProtection = (allowedOrigins) => (req, res, next) => {
  if (!validateCsrfRequest(req, allowedOrigins)) {
    return res.status(403).json({ error: 'CSRF validation failed.' });
  }
  return next();
};

module.exports = { createCsrfProtection, isAllowedOrigin, validateCsrfRequest };
