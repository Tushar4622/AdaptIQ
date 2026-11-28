const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_FAMILY_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_HISTORY_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
const SESSION_FIELDS =
  '+refreshToken +refreshTokenFamilyId +refreshTokenFamilyExpiresAt +refreshTokenHistory';

const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const toStoredHash = (value) =>
  /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : hashRefreshToken(value);

const createTokenError = (message, code = 'INVALID_REFRESH_TOKEN') =>
  Object.assign(new Error(message), { code });

const createAuthTokenService = ({
  userModel = User,
  jwtLibrary = jwt,
  accessSecret = process.env.JWT_SECRET,
  refreshSecret = process.env.JWT_REFRESH_SECRET,
  now = Date.now,
} = {}) => {
  const signAccessToken = (userId) =>
    jwtLibrary.sign({ id: String(userId) }, accessSecret, { expiresIn: ACCESS_TOKEN_TTL });

  const signRefreshToken = (userId, familyId, familyExpiresAt) => {
    const remainingSeconds = Math.floor((familyExpiresAt.getTime() - now()) / 1000);
    const expiresIn = Math.min(REFRESH_TOKEN_TTL_SECONDS, remainingSeconds);
    if (expiresIn <= 0) throw createTokenError('Refresh token family has expired.');
    return jwtLibrary.sign(
      {
        id: String(userId),
        tokenUse: 'refresh',
        familyId,
        familyExp: Math.floor(familyExpiresAt.getTime() / 1000),
        jti: crypto.randomUUID(),
      },
      refreshSecret,
      { expiresIn }
    );
  };

  const readUser = async (userId) => userModel.findById(userId).select(SESSION_FIELDS);

  const pruneHistory = (history = []) => {
    const oldestAllowed = now() - REFRESH_HISTORY_TTL_MS;
    return history
      .map((entry) => ({
        familyId: entry.familyId,
        tokenHash: entry.tokenHash,
        usedAt: new Date(entry.usedAt),
      }))
      .filter(
        (entry) =>
          entry.familyId &&
          /^[a-f0-9]{64}$/i.test(entry.tokenHash || '') &&
          Number.isFinite(entry.usedAt.getTime()) &&
          entry.usedAt.getTime() >= oldestAllowed
      );
  };

  const revokeFamily = async (userId, familyId) => {
    if (!familyId) return;
    await userModel.findOneAndUpdate(
      { _id: userId, refreshTokenFamilyId: familyId },
      {
        $set: {
          refreshToken: null,
          refreshTokenFamilyId: null,
          refreshTokenFamilyExpiresAt: null,
        },
      }
    );
  };

  const issueForUser = async (userId) => {
    const user = await readUser(userId);
    if (!user || !user.isActive) throw createTokenError('Account is unavailable.');

    const issuedAt = now();
    const familyId = crypto.randomUUID();
    const familyExpiresAt = new Date(issuedAt + TOKEN_FAMILY_TTL_SECONDS * 1000);
    const history = pruneHistory(user.refreshTokenHistory);
    if (user.refreshToken) {
      history.push({
        familyId: user.refreshTokenFamilyId || crypto.randomUUID(),
        tokenHash: toStoredHash(user.refreshToken),
        usedAt: new Date(issuedAt),
      });
    }

    const refreshToken = signRefreshToken(user._id, familyId, familyExpiresAt);
    user.refreshToken = hashRefreshToken(refreshToken);
    user.refreshTokenFamilyId = familyId;
    user.refreshTokenFamilyExpiresAt = familyExpiresAt;
    user.refreshTokenHistory = history;
    await user.save({ validateBeforeSave: false });

    return { token: signAccessToken(user._id), refreshToken, user };
  };

  const rotate = async (refreshToken, retry = 0) => {
    let decoded;
    try {
      decoded = jwtLibrary.verify(refreshToken, refreshSecret);
    } catch {
      throw createTokenError('Invalid or expired refresh token.');
    }
    if (!decoded.id || (decoded.tokenUse && decoded.tokenUse !== 'refresh')) {
      throw createTokenError('Invalid refresh token.');
    }

    const user = await readUser(decoded.id);
    if (!user || !user.isActive) throw createTokenError('Account is unavailable.');

    const incomingHash = hashRefreshToken(refreshToken);
    const storedToken = user.refreshToken;
    const storedTokenMatches =
      typeof storedToken === 'string' &&
      (storedToken === incomingHash || storedToken === refreshToken);

    if (storedTokenMatches) {
      const familyId = user.refreshTokenFamilyId || decoded.familyId || crypto.randomUUID();
      if (decoded.familyId && decoded.familyId !== familyId) {
        throw createTokenError('Refresh token family does not match.');
      }

      const familyExpiresAt =
        user.refreshTokenFamilyExpiresAt ||
        new Date(
          (decoded.familyExp ||
            ((decoded.iat || Math.floor(now() / 1000)) + TOKEN_FAMILY_TTL_SECONDS)) *
            1000
        );
      if (familyExpiresAt.getTime() <= now()) {
        await revokeFamily(user._id, familyId);
        throw createTokenError('Refresh token family has expired.');
      }

      const nextRefreshToken = signRefreshToken(user._id, familyId, familyExpiresAt);
      const history = pruneHistory(user.refreshTokenHistory);
      history.push({ familyId, tokenHash: incomingHash, usedAt: new Date(now()) });
      const nextHash = hashRefreshToken(nextRefreshToken);
      const updated = await userModel.findOneAndUpdate(
        { _id: user._id, refreshToken: storedToken },
        {
          $set: {
            refreshToken: nextHash,
            refreshTokenFamilyId: familyId,
            refreshTokenFamilyExpiresAt: familyExpiresAt,
            refreshTokenHistory: history,
          },
        },
        { new: true, runValidators: false }
      );

      if (updated) {
        return {
          token: signAccessToken(user._id),
          refreshToken: nextRefreshToken,
          user: updated,
        };
      }
    }

    const latestUser = await readUser(decoded.id);
    const tokenRemainsCurrent =
      latestUser?.refreshToken === incomingHash || latestUser?.refreshToken === refreshToken;
    if (tokenRemainsCurrent && retry === 0) {
      return rotate(refreshToken, 1);
    }
    const reusedToken = pruneHistory(latestUser?.refreshTokenHistory).find(
      (entry) => entry.tokenHash === incomingHash
    );
    if (reusedToken && reusedToken.familyId === latestUser.refreshTokenFamilyId) {
      await revokeFamily(latestUser._id, reusedToken.familyId);
      throw createTokenError(
        'Refresh token reuse detected. Please sign in again.',
        'REFRESH_TOKEN_REUSE'
      );
    }

    throw createTokenError('Invalid or revoked refresh token.');
  };

  const revoke = async (refreshToken) => {
    let decoded;
    try {
      decoded = jwtLibrary.verify(refreshToken, refreshSecret);
    } catch {
      return;
    }
    if (!decoded.id) return;

    const user = await readUser(decoded.id);
    if (!user) return;
    const incomingHash = hashRefreshToken(refreshToken);
    const currentMatches =
      user.refreshToken === incomingHash || user.refreshToken === refreshToken;

    if (currentMatches) {
      await userModel.findOneAndUpdate(
        { _id: user._id, refreshToken: user.refreshToken },
        {
          $set: {
            refreshToken: null,
            refreshTokenFamilyId: null,
            refreshTokenFamilyExpiresAt: null,
          },
        }
      );
      return;
    }

    const reusedToken = pruneHistory(user.refreshTokenHistory).find(
      (entry) => entry.tokenHash === incomingHash
    );
    if (reusedToken && reusedToken.familyId === user.refreshTokenFamilyId) {
      await revokeFamily(user._id, reusedToken.familyId);
    }
  };

  return { issueForUser, rotate, revoke };
};

module.exports = {
  ACCESS_TOKEN_TTL,
  createAuthTokenService,
  hashRefreshToken,
};
