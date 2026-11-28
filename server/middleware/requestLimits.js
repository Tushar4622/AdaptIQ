const rateLimitPackage = require('express-rate-limit');
const rateLimit = rateLimitPackage.rateLimit || rateLimitPackage;

const createRateLimiter = ({ windowMs, max, rateLimitImpl = rateLimit }) =>
  rateLimitImpl({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

const createAuthRateLimiters = (overrides = {}) => ({
  login: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, ...overrides.login }),
  mfa: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, ...overrides.mfa }),
  register: createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, ...overrides.register }),
  refresh: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, ...overrides.refresh }),
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    ...overrides.passwordReset,
  }),
});

module.exports = { createAuthRateLimiters, createRateLimiter };
