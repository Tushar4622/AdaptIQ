require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectMongo } = require('../config/db');
const User = require('../models/User');

const TOKEN_FAMILY_TTL_SECONDS = 30 * 24 * 60 * 60;

const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const migrateUserRefreshToken = (user, { refreshSecret, now = Date.now, jwtLibrary = jwt }) => {
  const value = user.refreshToken;
  if (typeof value !== 'string' || value.length === 0) return 'empty';

  if (/^[a-f0-9]{64}$/i.test(value)) {
    if (!user.refreshTokenFamilyId) user.refreshTokenFamilyId = crypto.randomUUID();
    if (!user.refreshTokenFamilyExpiresAt) {
      user.refreshTokenFamilyExpiresAt = new Date(now() + TOKEN_FAMILY_TTL_SECONDS * 1000);
    }
    if (!user.refreshTokenHistory) user.refreshTokenHistory = [];
    return 'already-hashed';
  }

  let decoded;
  try {
    decoded = jwtLibrary.verify(value, refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      user.refreshToken = null;
      user.refreshTokenFamilyId = null;
      user.refreshTokenFamilyExpiresAt = null;
      return 'expired';
    }
    throw new Error(`Could not verify refresh token for user ${user._id}.`);
  }
  if (String(decoded.id) !== String(user._id)) {
    throw new Error(`Refresh token owner mismatch for user ${user._id}.`);
  }
  if (decoded.tokenUse && decoded.tokenUse !== 'refresh') {
    throw new Error(`Unexpected token type for user ${user._id}.`);
  }

  const familyExpiresAt =
    decoded.familyExp !== undefined
      ? new Date(decoded.familyExp * 1000)
      : new Date(((decoded.iat || Math.floor(now() / 1000)) + TOKEN_FAMILY_TTL_SECONDS) * 1000);

  user.refreshToken = hashRefreshToken(value);
  user.refreshTokenFamilyId = decoded.familyId || crypto.randomUUID();
  user.refreshTokenFamilyExpiresAt = familyExpiresAt;
  user.refreshTokenHistory = user.refreshTokenHistory || [];
  return 'migrated';
};

const migrate = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to run this migration.');
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is required to verify existing refresh tokens.');
  }

  await connectMongo();
  const counts = { migrated: 0, alreadyHashed: 0, expired: 0 };
  try {
    const cursor = User.find({ refreshToken: { $type: 'string', $ne: '' } })
      .select('+refreshToken +refreshTokenFamilyId +refreshTokenFamilyExpiresAt +refreshTokenHistory')
      .cursor();

    for await (const user of cursor) {
      const result = migrateUserRefreshToken(user, {
        refreshSecret: process.env.JWT_REFRESH_SECRET,
      });
      if (result === 'empty') continue;
      await user.save({ validateBeforeSave: false });
      if (result === 'migrated') counts.migrated += 1;
      else if (result === 'already-hashed') counts.alreadyHashed += 1;
      else if (result === 'expired') counts.expired += 1;
    }
    console.log('Refresh-token migration completed:', counts);
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  migrate().catch((error) => {
    console.error(`[refresh-token migration] failed (${error?.name || 'Error'}).`);
    process.exitCode = 1;
  });
}

module.exports = { hashRefreshToken, migrateUserRefreshToken };
