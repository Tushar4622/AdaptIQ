// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  csrf,
  mfaSetup,
  mfaVerify,
  mfaVerifySetup,
  refresh,
} = require('../controllers/authController');
const { createCsrfProtection } = require('../middleware/csrfProtection');
const { createAuthRateLimiters } = require('../middleware/requestLimits');
const { authSchemas, validateBody } = require('../middleware/requestValidation');
const csrfProtection = createCsrfProtection();
const limits = createAuthRateLimiters();

router.use(
  ['/password-reset', '/forgot-password', '/reset-password', '/password/reset'],
  limits.passwordReset
);

router.post('/register', limits.register, validateBody(authSchemas.register), register);
router.post('/login', limits.login, validateBody(authSchemas.login), login);
router.post('/mfa/setup', limits.mfa, csrfProtection, validateBody(authSchemas.mfaSetup), mfaSetup);
router.post(
  '/mfa/verify-setup',
  limits.mfa,
  csrfProtection,
  validateBody(authSchemas.mfaSetupVerify),
  mfaVerifySetup
);
router.post(
  '/mfa/verify',
  limits.mfa,
  csrfProtection,
  validateBody(authSchemas.mfaVerify),
  mfaVerify
);

router.get('/csrf', csrf);
router.post('/refresh', limits.refresh, csrfProtection, validateBody(authSchemas.refresh), refresh);
router.post('/logout', csrfProtection, validateBody(authSchemas.logout), logout);

module.exports = router;
