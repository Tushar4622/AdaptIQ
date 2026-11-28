const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { awardEligibleBadges } = require('../utils/gamification');
const { createAuthTokenService } = require('../services/authTokens');
const {
  clearFailedLoginState,
  isLoginLocked,
  recordFailedLogin,
} = require('../services/loginProtection');
const {
  createOtpAuthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  findMatchingTotpCounter,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  generateTotpSecret,
  getMfaEncryptionKey,
  hashRecoveryCode,
} = require('../services/mfa');
const {
  clearAuthCookies,
  setAuthCookies,
  setCsrfCookie,
} = require('../utils/authCookies');
const { isAllowedOrigin } = require('../middleware/csrfProtection');
const { logSecurityEvent } = require('../services/securityLogger');

const tokenService = createAuthTokenService();
const legacyJsonRefreshEnabled = process.env.ALLOW_LEGACY_REFRESH_TOKENS === 'true';
const MFA_ACTION_TOKEN_TTL = '5m';
const MFA_SETUP_TTL_MS = 5 * 60 * 1000;
const privilegedRoles = new Set(['teacher', 'admin']);

const createMfaActionToken = (userId, tokenUse) =>
  jwt.sign({ id: String(userId), tokenUse }, process.env.JWT_SECRET, {
    expiresIn: MFA_ACTION_TOKEN_TTL,
  });

const verifyMfaActionToken = (token, tokenUse) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof decoded !== 'object' ||
      typeof decoded.id !== 'string' ||
      decoded.tokenUse !== tokenUse
    ) {
      throw new Error('Invalid MFA challenge token.');
    }
    return decoded.id;
  } catch {
    throw Object.assign(new Error('Invalid or expired MFA challenge.'), {
      code: 'INVALID_MFA_CHALLENGE',
      statusCode: 401,
    });
  }
};

const sendLockedResponse = (res, user, req) => {
  if (!isLoginLocked(user)) return false;
  logSecurityEvent('auth.login.locked', req, { reason: 'progressive_lockout' });
  const retryAfter = Math.max(
    1,
    Math.ceil((new Date(user.loginLockedUntil).getTime() - Date.now()) / 1000)
  );
  res.setHeader('Retry-After', String(retryAfter));
  res.status(429).json({
    error: 'Too many failed sign-in attempts. Try again later.',
    code: 'ACCOUNT_LOCKED',
  });
  return true;
};

const sendFailedCredentialResponse = async (res, userId, req) => {
  logSecurityEvent('auth.login.failed', req, { reason: 'credentials' });
  const failure = await recordFailedLogin(User, userId);
  if (failure.lockedUntil) {
    const retryAfter = Math.max(1, Math.ceil((failure.lockedUntil.getTime() - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many failed sign-in attempts. Try again later.',
      code: 'ACCOUNT_LOCKED',
    });
  }
  return res.status(401).json({ error: 'Incorrect email or password.' });
};

const completeLogin = async (user, req, res, statusCode = 200, extraPayload = {}) => {
  await clearFailedLoginState(User, user);

  const today = new Date().toDateString();
  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastActive === yesterday) user.streak += 1;
  else if (lastActive !== today) user.streak = 1;
  user.lastActiveDate = new Date();
  await user.save({ validateBeforeSave: false });

  const awardedBadges = await awardEligibleBadges(user._id, ['streak_7', 'study_late'], {
    loginHour: new Date().getHours(),
    userDoc: user,
  });
  const refreshedUser = await User.findById(user._id);
  return sendTokens(refreshedUser, statusCode, req, res, {
    awardedBadges,
    ...extraPayload,
  });
};

const loadMfaUser = (userId) => User.findById(userId).select(
  '+failedLoginAttempts +loginLockedUntil +mfaSecretEncrypted ' +
  '+mfaPendingSecretEncrypted +mfaSetupExpiresAt +mfaRecoveryCodeHashes +mfaLastUsedStep'
);

const respondMfaFailure = async (res, user, req) => {
  logSecurityEvent('auth.mfa.failed', req, { reason: 'invalid_code' });
  const failure = await recordFailedLogin(User, user._id);
  if (failure.lockedUntil) {
    const retryAfter = Math.max(1, Math.ceil((failure.lockedUntil.getTime() - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many failed sign-in attempts. Try again later.',
      code: 'ACCOUNT_LOCKED',
    });
  }
  return res.status(401).json({ error: 'Invalid authentication code.' });
};

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  xp: user.xp,
  level: user.level,
  streak: user.streak,
});

const sendTokens = async (user, statusCode, req, res, extraPayload = {}) => {
  if (privilegedRoles.has(user.role) && !user.mfaEnabled) {
    return res.status(403).json({
      error: 'Multi-factor authentication setup is required.',
      code: 'MFA_SETUP_REQUIRED',
    });
  }
  const tokens = await tokenService.issueForUser(user._id);
  const cookieMode = req.get('x-auth-token-mode') === 'cookie';
  if (cookieMode) setAuthCookies(res, tokens.refreshToken);
  const response = {
    token: tokens.token,
    user: publicUser(tokens.user),
    ...extraPayload,
  };

  // Old deployed clients still expect JSON refresh tokens during the transition.
  if (!cookieMode && legacyJsonRefreshEnabled) {
    response.refreshToken = tokens.refreshToken;
  }
  res.status(statusCode).json(response);
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, institution } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'teacher' ? 'teacher' : 'student',
      institution: institution || '',
    });

    if (privilegedRoles.has(user.role)) {
      return res.status(201).json({
        mfaSetupRequired: true,
        setupToken: createMfaActionToken(user._id, 'mfa_setup'),
      });
    }

    await sendTokens(user, 201, req, res);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email }).select(
      '+password +failedLoginAttempts +loginLockedUntil'
    );

    if (!user) {
      logSecurityEvent('auth.login.failed', req, { reason: 'credentials' });
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    if (sendLockedResponse(res, user, req)) return;
    if (!(await user.comparePassword(password))) {
      return sendFailedCredentialResponse(res, user._id, req);
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deactivated. Please contact support.' });
    }

    if (privilegedRoles.has(user.role)) {
      if (user.mfaEnabled) {
        return res.json({
          mfaRequired: true,
          challengeToken: createMfaActionToken(user._id, 'mfa_challenge'),
        });
      }
      return res.json({
        mfaSetupRequired: true,
        setupToken: createMfaActionToken(user._id, 'mfa_setup'),
      });
    }

    await completeLogin(user, req, res);
  } catch (err) {
    next(err);
  }
};

exports.mfaSetup = async (req, res, next) => {
  try {
    const userId = verifyMfaActionToken(req.body.setupToken, 'mfa_setup');
    const user = await loadMfaUser(userId);
    if (!user || !privilegedRoles.has(user.role) || user.mfaEnabled) {
      return res.status(401).json({ error: 'MFA setup is unavailable for this account.' });
    }
    if (sendLockedResponse(res, user, req)) return;

    const secret = generateTotpSecret();
    const encryptionKey = getMfaEncryptionKey();
    user.mfaPendingSecretEncrypted = encryptTotpSecret(secret, encryptionKey);
    user.mfaSetupExpiresAt = new Date(Date.now() + MFA_SETUP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    return res.json({
      secret,
      otpauthUri: createOtpAuthUri(user.email, secret),
      expiresIn: MFA_SETUP_TTL_MS / 1000,
    });
  } catch (error) {
    if (error.code === 'INVALID_MFA_CHALLENGE') {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
};

exports.mfaVerifySetup = async (req, res, next) => {
  try {
    const userId = verifyMfaActionToken(req.body.setupToken, 'mfa_setup');
    const user = await loadMfaUser(userId);
    if (!user || !privilegedRoles.has(user.role) || user.mfaEnabled) {
      return res.status(401).json({ error: 'MFA setup is unavailable for this account.' });
    }
    if (sendLockedResponse(res, user, req)) return;
    if (
      !user.mfaPendingSecretEncrypted ||
      !user.mfaSetupExpiresAt ||
      new Date(user.mfaSetupExpiresAt).getTime() <= Date.now()
    ) {
      return res.status(410).json({ error: 'MFA setup expired. Start setup again.' });
    }

    const encryptionKey = getMfaEncryptionKey();
    const secret = decryptTotpSecret(user.mfaPendingSecretEncrypted, encryptionKey);
    const matchingStep = findMatchingTotpCounter(secret, req.body.code);
    if (matchingStep === null) return respondMfaFailure(res, user, req);

    const recoveryCodes = generateRecoveryCodes();
    user.mfaEnabled = true;
    user.mfaSecretEncrypted = user.mfaPendingSecretEncrypted;
    user.mfaPendingSecretEncrypted = undefined;
    user.mfaSetupExpiresAt = undefined;
    user.mfaRecoveryCodeHashes = recoveryCodes.map((code) =>
      hashRecoveryCode(code, encryptionKey)
    );
    user.mfaLastUsedStep = matchingStep;
    await user.save({ validateBeforeSave: false });

    return completeLogin(user, req, res, 200, { recoveryCodes });
  } catch (error) {
    if (error.code === 'INVALID_MFA_CHALLENGE') {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
};

exports.mfaVerify = async (req, res, next) => {
  try {
    const userId = verifyMfaActionToken(req.body.challengeToken, 'mfa_challenge');
    const user = await loadMfaUser(userId);
    if (!user || !privilegedRoles.has(user.role) || !user.mfaEnabled) {
      return res.status(401).json({ error: 'MFA verification is unavailable for this account.' });
    }
    if (sendLockedResponse(res, user, req)) return;

    const encryptionKey = getMfaEncryptionKey();
    if (req.body.code) {
      const secret = decryptTotpSecret(user.mfaSecretEncrypted, encryptionKey);
      const matchingStep = findMatchingTotpCounter(secret, req.body.code, {
        lastUsedCounter: user.mfaLastUsedStep,
      });
      if (matchingStep === null) return respondMfaFailure(res, user, req);
      user.mfaLastUsedStep = matchingStep;
    } else {
      const recoveryIndex = findRecoveryCodeIndex(
        req.body.recoveryCode,
        user.mfaRecoveryCodeHashes || [],
        encryptionKey
      );
      if (recoveryIndex < 0) return respondMfaFailure(res, user, req);
      user.mfaRecoveryCodeHashes.splice(recoveryIndex, 1);
    }

    return completeLogin(user, req, res);
  } catch (error) {
    if (error.code === 'INVALID_MFA_CHALLENGE') {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    const tokens = await tokenService.rotate(refreshToken);
    if (privilegedRoles.has(tokens.user.role) && !tokens.user.mfaEnabled) {
      await tokenService.revoke(tokens.refreshToken);
      clearAuthCookies(res);
      return res.status(403).json({
        error: 'Multi-factor authentication setup is required. Sign in to set it up.',
        code: 'MFA_SETUP_REQUIRED',
      });
    }

    const cookieMode = req.get('x-auth-token-mode') === 'cookie';
    if (cookieMode) setAuthCookies(res, tokens.refreshToken, req.cookies?.csrfToken);
    const response = { token: tokens.token };
    if (!cookieMode && legacyJsonRefreshEnabled && req.body?.refreshToken) {
      response.refreshToken = tokens.refreshToken;
    }
    res.json(response);
  } catch (err) {
    if (err.code === 'REFRESH_TOKEN_REUSE') {
      logSecurityEvent('auth.refresh.token_reuse', req, { reason: 'refresh_family_revoked' });
      clearAuthCookies(res);
    }
    if (err.code === 'INVALID_REFRESH_TOKEN' || err.code === 'REFRESH_TOKEN_REUSE') {
      return res.status(401).json({ error: err.message, code: err.code });
    }
    next(err);
  }
};

// GET /api/auth/csrf
exports.csrf = (req, res) => {
  const origin = req.get('origin');
  if (
    (origin && !isAllowedOrigin(origin)) ||
    (!origin && req.get('sec-fetch-site') === 'cross-site')
  ) {
    return res.status(403).json({ error: 'Origin validation failed.' });
  }
  const csrfToken = setCsrfCookie(res, req.cookies?.csrfToken);
  return res.json({ csrfToken });
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      await tokenService.revoke(refreshToken);
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};
