const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {
  createAuthTokenService,
  hashRefreshToken,
} = require('../services/authTokens');
const { validateCsrfRequest } = require('../middleware/csrfProtection');
const { migrateUserRefreshToken } = require('../utils/migrateRefreshTokens');
const {
  clearAuthCookies,
  getCsrfCookieOptions,
  getRefreshCookieOptions,
  setAuthCookies,
} = require('../utils/authCookies');

const accessSecret = 'test-access-secret-for-auth-token-tests';
const refreshSecret = 'test-refresh-secret-for-auth-token-tests';
const allowedOrigins = ['http://localhost:5173'];

const createUserModel = (user) => ({
  findById: () => ({
    select: async () => user,
  }),
  findOneAndUpdate: async (filter, update) => {
    if (
      String(user._id) !== String(filter._id) ||
      (filter.refreshToken !== undefined && user.refreshToken !== filter.refreshToken) ||
      (filter.refreshTokenFamilyId !== undefined &&
        user.refreshTokenFamilyId !== filter.refreshTokenFamilyId)
    ) {
      return null;
    }
    Object.assign(user, update.$set);
    return user;
  },
});

const createUser = () => ({
  _id: 'user-123',
  isActive: true,
  refreshToken: undefined,
  refreshTokenFamilyId: undefined,
  refreshTokenFamilyExpiresAt: undefined,
  refreshTokenHistory: [],
  save: async () => {},
});

test('refresh tokens are stored as SHA-256 hashes and access tokens expire in 15 minutes', async () => {
  const user = createUser();
  const service = createAuthTokenService({
    userModel: createUserModel(user),
    accessSecret,
    refreshSecret,
  });

  const tokens = await service.issueForUser(user._id);
  const accessPayload = jwt.verify(tokens.token, accessSecret);

  assert.equal(user.refreshToken, hashRefreshToken(tokens.refreshToken));
  assert.notEqual(user.refreshToken, tokens.refreshToken);
  assert.equal(accessPayload.exp - accessPayload.iat, 15 * 60);
});

test('refresh rotation records prior token hashes and rejects reuse by revoking its family', async () => {
  const user = createUser();
  user.role = 'teacher';
  user.mfaEnabled = true;
  const service = createAuthTokenService({
    userModel: createUserModel(user),
    accessSecret,
    refreshSecret,
  });
  const initial = await service.issueForUser(user._id);
  const rotated = await service.rotate(initial.refreshToken);

  assert.equal(rotated.user, user);
  assert.equal(rotated.user.role, 'teacher');
  assert.equal(user.refreshToken, hashRefreshToken(rotated.refreshToken));
  assert.equal(user.refreshTokenHistory[0].tokenHash, hashRefreshToken(initial.refreshToken));

  await assert.rejects(service.rotate(initial.refreshToken), { code: 'REFRESH_TOKEN_REUSE' });
  assert.equal(user.refreshToken, null);
  assert.equal(user.refreshTokenFamilyId, null);
});

test('refresh rotation retries when the one-time hash migration races with a refresh', async () => {
  const user = createUser();
  const userModel = createUserModel(user);
  const findOneAndUpdate = userModel.findOneAndUpdate;
  const service = createAuthTokenService({ userModel, accessSecret, refreshSecret });
  const initial = await service.issueForUser(user._id);

  user.refreshToken = initial.refreshToken;
  let migrationRace = true;
  userModel.findOneAndUpdate = async (filter, update) => {
    if (migrationRace) {
      migrationRace = false;
      user.refreshToken = hashRefreshToken(initial.refreshToken);
      return null;
    }
    return findOneAndUpdate(filter, update);
  };

  const rotated = await service.rotate(initial.refreshToken);
  assert.equal(user.refreshToken, hashRefreshToken(rotated.refreshToken));
});

test('logout revokes the active refresh token', async () => {
  const user = createUser();
  const service = createAuthTokenService({
    userModel: createUserModel(user),
    accessSecret,
    refreshSecret,
  });
  const tokens = await service.issueForUser(user._id);

  await service.revoke(tokens.refreshToken);

  assert.equal(user.refreshToken, null);
  assert.equal(user.refreshTokenFamilyId, null);
});

test('the compatibility migration hashes a valid active token and is idempotent', () => {
  const refreshToken = jwt.sign({ id: 'user-123' }, refreshSecret, { expiresIn: '7d' });
  const user = { _id: 'user-123', refreshToken };

  assert.equal(migrateUserRefreshToken(user, { refreshSecret }), 'migrated');
  assert.equal(user.refreshToken, hashRefreshToken(refreshToken));
  assert.notEqual(user.refreshToken, refreshToken);
  assert.equal(migrateUserRefreshToken(user, { refreshSecret }), 'already-hashed');
});

test('cookie-authenticated requests require matching CSRF cookie/header and trusted origin', () => {
  const createRequest = ({ origin, cookie, header }) => ({
    cookies: { refreshToken: 'cookie-refresh', csrfToken: cookie },
    get(name) {
      return {
        origin,
        'x-csrf-token': header,
      }[name.toLowerCase()];
    },
  });

  assert.equal(
    validateCsrfRequest(
      createRequest({
        origin: allowedOrigins[0],
        cookie: 'csrf-value',
        header: 'csrf-value',
      }),
      allowedOrigins
    ),
    true
  );
  assert.equal(
    validateCsrfRequest(
      createRequest({
        origin: 'https://attacker.example',
        cookie: 'csrf-value',
        header: 'csrf-value',
      }),
      allowedOrigins
    ),
    false
  );
  assert.equal(
    validateCsrfRequest(
      createRequest({
        origin: allowedOrigins[0],
        cookie: 'csrf-value',
        header: 'wrong-value',
      }),
      allowedOrigins
    ),
    false
  );

  const legacyRequest = {
    body: { refreshToken: 'legacy-token' },
    cookies: {},
    get: (name) => (name.toLowerCase() === 'origin' ? allowedOrigins[0] : undefined),
  };
  assert.equal(validateCsrfRequest(legacyRequest, allowedOrigins), true);
  assert.equal(validateCsrfRequest(legacyRequest, []), false);
});

test('refresh cookies are HttpOnly, SameSite=Strict, Secure in production, and cleared at logout', () => {
  assert.deepEqual(getRefreshCookieOptions(true), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  assert.equal(getRefreshCookieOptions(false).secure, false);
  assert.equal(getCsrfCookieOptions(true).httpOnly, false);

  const cookies = [];
  const res = {
    cookie: (name, value, options) => cookies.push({ name, value, options }),
    clearCookie: (name, options) => cookies.push({ name, options, cleared: true }),
  };
  const csrfToken = setAuthCookies(res, 'refresh-value', 'csrf-value');
  assert.equal(csrfToken, 'csrf-value');
  assert.equal(cookies[0].name, 'refreshToken');
  assert.equal(cookies[0].options.httpOnly, true);
  assert.equal(cookies[1].name, 'csrfToken');

  clearAuthCookies(res);
  assert.equal(cookies[2].cleared, true);
  assert.equal(cookies[2].options.maxAge, undefined);
  assert.equal(cookies[3].options.maxAge, undefined);
});
