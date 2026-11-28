const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

const MAGIC = Buffer.from('ADAPTIQ-MONGO-BACKUP-V1\n', 'ascii');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + IV_LENGTH;

const getBackupKey = (value = process.env.BACKUP_ENCRYPTION_KEY) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('BACKUP_ENCRYPTION_KEY must be 32 random bytes encoded as 64 hexadecimal characters.');
  }
  return Buffer.from(value, 'hex');
};

const parseMongoUri = (uri) => {
  if (typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('A valid MongoDB connection URI is required.');
  }

  const schemeEnd = uri.indexOf('://') + 3;
  const queryStart = uri.indexOf('?', schemeEnd);
  const pathEnd = queryStart === -1 ? uri.length : queryStart;
  const authorityAndPath = uri.slice(schemeEnd, pathEnd);
  const slash = authorityAndPath.indexOf('/');
  if (slash === -1) throw new Error('MongoDB URI must name a database.');

  const authority = authorityAndPath.slice(0, slash);
  const hostList = authority.slice(authority.lastIndexOf('@') + 1);
  const database = decodeURIComponent(authorityAndPath.slice(slash + 1));
  if (!hostList || !database || database.includes('/')) {
    throw new Error('MongoDB URI must name a database and at least one host.');
  }

  return {
    database,
    hosts: hostList.split(',').map((host) => host.toLowerCase()).sort(),
  };
};

const sameMongoDatabase = (leftUri, rightUri) => {
  const left = parseMongoUri(leftUri);
  const right = parseMongoUri(rightUri);
  return left.database === right.database &&
    left.hosts.length === right.hosts.length &&
    left.hosts.every((host, index) => host === right.hosts[index]);
};

const isLoopbackMongoUri = (uri) => {
  const { hosts } = parseMongoUri(uri);
  return hosts.every((entry) => {
    const host = entry.startsWith('[')
      ? entry.slice(1, entry.indexOf(']'))
      : entry.split(':')[0];
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  });
};

const assertSafeRestoreTarget = (sourceUri, targetUri) => {
  const source = parseMongoUri(sourceUri);
  const target = parseMongoUri(targetUri);
  if (sameMongoDatabase(sourceUri, targetUri)) {
    throw new Error('Restore target must not be the source database.');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(source.database) || !/^[A-Za-z0-9_-]+$/.test(target.database)) {
    throw new Error('Backup and restore database names must contain only letters, numbers, underscores, or hyphens.');
  }
  return { sourceDatabase: source.database, targetDatabase: target.database };
};

const encryptBuffer = (plaintext, key) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, iv, ciphertext, cipher.getAuthTag()]);
};

const decryptBuffer = (archive, key) => {
  if (!Buffer.isBuffer(archive) || archive.length < HEADER_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted backup is truncated or invalid.');
  }
  if (!archive.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Encrypted backup format is not recognized.');
  }

  const iv = archive.subarray(MAGIC.length, HEADER_LENGTH);
  const tag = archive.subarray(-TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(archive.subarray(HEADER_LENGTH, -TAG_LENGTH)),
    decipher.final(),
  ]);
};

const encryptStreamToArchive = async (input, archivePath, key) => {
  const output = path.resolve(archivePath);
  await fsp.mkdir(path.dirname(output), { recursive: true });
  try {
    await fsp.access(output);
    throw new Error('Backup destination already exists; choose a new filename.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const temporaryDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), 'adaptiq-backup-'));
  const encryptedPath = path.join(temporaryDirectory, 'encrypted-data');
  const temporaryArchive = `${output}.${crypto.randomUUID()}.tmp`;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  try {
    await pipeline(
      input,
      cipher,
      fs.createWriteStream(encryptedPath, { flags: 'wx', mode: 0o600 }),
    );
    await fsp.writeFile(temporaryArchive, Buffer.concat([MAGIC, iv]), { flag: 'wx', mode: 0o600 });
    await pipeline(
      fs.createReadStream(encryptedPath),
      fs.createWriteStream(temporaryArchive, { flags: 'a', mode: 0o600 }),
    );
    await fsp.appendFile(temporaryArchive, cipher.getAuthTag());
    await fsp.link(temporaryArchive, output);
    await fsp.unlink(temporaryArchive);
  } finally {
    await fsp.rm(temporaryDirectory, { recursive: true, force: true });
    await fsp.rm(temporaryArchive, { force: true });
  }
};

const decryptArchiveToFile = async (archivePath, plaintextPath, key) => {
  const archive = await fsp.open(archivePath, 'r');
  try {
    const { size } = await archive.stat();
    if (size < HEADER_LENGTH + TAG_LENGTH) {
      throw new Error('Encrypted backup is truncated or invalid.');
    }

    const header = Buffer.alloc(HEADER_LENGTH);
    const tag = Buffer.alloc(TAG_LENGTH);
    await archive.read(header, 0, HEADER_LENGTH, 0);
    await archive.read(tag, 0, TAG_LENGTH, size - TAG_LENGTH);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error('Encrypted backup format is not recognized.');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      header.subarray(MAGIC.length, HEADER_LENGTH),
    );
    decipher.setAuthTag(tag);
    const source = fs.createReadStream(archivePath, {
      start: HEADER_LENGTH,
      end: size - TAG_LENGTH - 1,
    });
    try {
      await pipeline(
        source,
        decipher,
        fs.createWriteStream(plaintextPath, { flags: 'wx', mode: 0o600 }),
      );
    } catch (error) {
      await fsp.rm(plaintextPath, { force: true });
      throw error;
    }
  } finally {
    await archive.close();
  }
};

module.exports = {
  assertSafeRestoreTarget,
  decryptArchiveToFile,
  decryptBuffer,
  encryptBuffer,
  encryptStreamToArchive,
  getBackupKey,
  isLoopbackMongoUri,
  parseMongoUri,
  sameMongoDatabase,
};
