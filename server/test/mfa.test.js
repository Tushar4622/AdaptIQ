const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  authSchemas,
} = require('../middleware/requestValidation');
const { protect } = require('../middleware/auth');
const {
  createTotpCode,
  decryptTotpSecret,
  encodeBase32,
  encryptTotpSecret,
  findMatchingTotpCounter,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  getMfaEncryptionKey,
  hashRecoveryCode,
} = require('../services/mfa');
const {
  clearFailedLoginState,
  getLoginLockDuration,
  isLoginLocked,
  recordFailedLogin,
} = require('../services/loginProtection');

test('TOTP follows RFC 6238 values and rejects replayed counters', () => {
  const secret = encodeBase32(Buffer.from('12345678901234567890'));
  const code = createTotpCode(secret, 1);

  assert.equal(code, '287082');
  assert.equal(findMatchingTotpCounter(secret, code, { now: 59_000, window: 0 }), 1);
  assert.equal(
    findMatchingTotpCounter(secret, code, {
      now: 59_000,
      window: 0,
      lastUsedCounter: 1,
    }),
    null
  );
  assert.equal(findMatchingTotpCounter(secret, '12345', { now: 59_000 }), null);
});

test('TOTP secrets are authenticated-encrypted and invalid key configuration fails closed', () => {
  const key = Buffer.alloc(32, 7);
  const encrypted = encryptTotpSecret('test-secret', key);
  assert.equal(decryptTotpSecret(encrypted, key), 'test-secret');

  const parts = encrypted.split('.');
  parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;
  assert.throws(() => decryptTotpSecret(parts.join('.'), key));
  assert.throws(
    () => getMfaEncryptionKey('not-a-hex-key'),
    { code: 'MFA_CONFIGURATION_ERROR', statusCode: 503 }
  );
});

test('recovery codes are randomly generated, hashed, and match only while unused', () => {
  const key = Buffer.alloc(32, 9);
  const codes = generateRecoveryCodes(3);
  const hashes = codes.map((code) => hashRecoveryCode(code, key));

  assert.equal(codes.length, 3);
  assert.match(codes[0], /^[A-F\d]{6}(?:-[A-F\d]{6}){3}$/);
  assert.equal(new Set(hashes).size, hashes.length);
  assert.equal(findRecoveryCodeIndex(codes[1], hashes, key), 1);

  hashes.splice(1, 1);
  assert.equal(findRecoveryCodeIndex(codes[1], hashes, key), -1);
});

test('registration enforces password policy and MFA requires exactly one valid credential', () => {
  const registration = (password) => authSchemas.register.safeParse({
    name: 'Test Student',
    email: 'student@example.com',
    password,
    role: 'student',
  }).success;

  assert.equal(registration('Short1!'), false);
  assert.equal(registration('lowercaseonly123!'), false);
  assert.equal(registration('ValidPassword123!'), true);

  const challenge = { challengeToken: 'signed-challenge' };
  assert.equal(authSchemas.mfaVerify.safeParse({ ...challenge, code: '123456' }).success, true);
  assert.equal(
    authSchemas.mfaVerify.safeParse({
      ...challenge,
      recoveryCode: 'ABCDEF-123456-ABCDEF-123456',
    }).success,
    true
  );
  assert.equal(
    authSchemas.mfaVerify.safeParse({ ...challenge, code: '123456', recoveryCode: 'ABCDEF' }).success,
    false
  );
});

test('teacher and admin API access is denied until MFA is enabled', async () => {
  const originalFindById = User.findById;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret-for-mfa-middleware';
  const res = {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  let authenticatedUser;

  try {
    User.findById = () => ({ select: async () => authenticatedUser });
    for (const role of ['teacher', 'admin']) {
      authenticatedUser = {
        _id: `${role}-1`,
        role,
        isActive: true,
        mfaEnabled: false,
      };
      const token = jwt.sign({ id: authenticatedUser._id }, process.env.JWT_SECRET);
      res.statusCode = 200;
      res.body = null;
      nextCalled = false;
      await protect(
        { headers: { authorization: `Bearer ${token}` } },
        res,
        () => { nextCalled = true; }
      );

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.code, 'MFA_SETUP_REQUIRED');
      assert.equal(nextCalled, false);
    }

    authenticatedUser.mfaEnabled = true;
    const enabledToken = jwt.sign({ id: authenticatedUser._id }, process.env.JWT_SECRET);
    await protect(
      { headers: { authorization: `Bearer ${enabledToken}` } },
      res,
      () => { nextCalled = true; }
    );
    assert.equal(nextCalled, true);
  } finally {
    User.findById = originalFindById;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('progressive account lockout escalates and successful login state clears', async () => {
  assert.equal(getLoginLockDuration(4), 0);
  assert.equal(getLoginLockDuration(5), 60_000);
  assert.equal(getLoginLockDuration(10), 120_000);
  assert.equal(getLoginLockDuration(35), 60 * 60 * 1000);

  const user = { _id: 'user-1', failedLoginAttempts: 4, loginLockedUntil: null };
  const model = {
    findByIdAndUpdate: (_id, update) => {
      user.failedLoginAttempts += update.$inc.failedLoginAttempts;
      const query = Promise.resolve(user);
      query.select = () => query;
      return query;
    },
    updateOne: async (filter, update) => {
      if (filter.failedLoginAttempts === user.failedLoginAttempts) {
        Object.assign(user, update.$set);
      }
    },
  };

  const now = 1_000_000;
  const failure = await recordFailedLogin(model, user._id, now);
  assert.equal(failure.lockedUntil.getTime(), now + 60_000);
  assert.equal(isLoginLocked(user, now), true);

  await clearFailedLoginState(model, user);
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.loginLockedUntil, null);
});
