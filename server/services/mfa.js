const crypto = require('node:crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;

const getMfaEncryptionKey = (value = process.env.MFA_ENCRYPTION_KEY) => {
  if (!/^[a-f\d]{64}$/i.test(value || '')) {
    throw Object.assign(
      new Error('MFA_ENCRYPTION_KEY must be configured as 64 hexadecimal characters.'),
      { code: 'MFA_CONFIGURATION_ERROR', statusCode: 503 }
    );
  }
  return Buffer.from(value, 'hex');
};

const encodeBase32 = (bytes) => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
};

const decodeBase32 = (value) => {
  let bits = 0;
  let accumulator = 0;
  const output = [];

  for (const character of String(value || '').toUpperCase().replace(/=+$/g, '')) {
    const digit = BASE32_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error('Invalid TOTP secret.');
    accumulator = (accumulator << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (output.length < 10) throw new Error('Invalid TOTP secret.');
  return Buffer.from(output);
};

const generateTotpSecret = () => encodeBase32(crypto.randomBytes(20));

const createOtpAuthUri = (email, secret, issuer = 'AdaptIQ') => {
  const label = `${issuer}:${email}`;
  const parameters = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${parameters.toString()}`;
};

const createTotpCode = (secret, counter) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
};

const findMatchingTotpCounter = (
  secret,
  code,
  { now = Date.now(), window = 1, lastUsedCounter = -1 } = {}
) => {
  if (!/^\d{6}$/.test(String(code || ''))) return null;

  const currentCounter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
  const supplied = Buffer.from(String(code));
  for (let offset = -window; offset <= window; offset += 1) {
    const counter = currentCounter + offset;
    if (counter < 0 || counter <= lastUsedCounter) continue;
    const expected = Buffer.from(createTotpCode(secret, counter));
    if (crypto.timingSafeEqual(supplied, expected)) return counter;
  }
  return null;
};

const encryptTotpSecret = (secret, key = getMfaEncryptionKey()) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
};

const decryptTotpSecret = (encrypted, key = getMfaEncryptionKey()) => {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = String(encrypted || '').split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext || extra.length > 0) {
    throw new Error('Stored MFA secret is invalid.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encodedIv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

const generateRecoveryCodes = (count = 10) =>
  Array.from({ length: count }, () => {
    const rawCode = crypto.randomBytes(12).toString('hex').toUpperCase();
    return rawCode.match(/.{1,6}/g).join('-');
  });

const normalizeRecoveryCode = (code) => String(code || '').replace(/[\s-]/g, '').toUpperCase();

const hashRecoveryCode = (code, key = getMfaEncryptionKey()) =>
  crypto.createHmac('sha256', key).update(normalizeRecoveryCode(code)).digest('hex');

const findRecoveryCodeIndex = (code, hashes, key = getMfaEncryptionKey()) => {
  const suppliedHash = Buffer.from(hashRecoveryCode(code, key), 'hex');
  let matchedIndex = -1;

  hashes.forEach((storedHash, index) => {
    if (!/^[a-f\d]{64}$/i.test(storedHash || '')) return;
    const stored = Buffer.from(storedHash, 'hex');
    if (crypto.timingSafeEqual(suppliedHash, stored)) matchedIndex = index;
  });

  return matchedIndex;
};

module.exports = {
  TOTP_PERIOD_SECONDS,
  createOtpAuthUri,
  createTotpCode,
  decryptTotpSecret,
  encodeBase32,
  encryptTotpSecret,
  findMatchingTotpCounter,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  generateTotpSecret,
  getMfaEncryptionKey,
  hashRecoveryCode,
};
