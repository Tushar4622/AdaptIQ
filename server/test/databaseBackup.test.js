const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const {
  assertSafeRestoreTarget,
  decryptArchiveToFile,
  decryptBuffer,
  encryptBuffer,
  encryptStreamToArchive,
  getBackupKey,
  isLoopbackMongoUri,
  parseMongoUri,
} = require('../services/databaseBackup');

const sourceUri = 'mongodb://localhost:27017/adaptiq_backup_source';
const targetUri = 'mongodb://127.0.0.1:27017/adaptiq_backup_target';

test('encrypted backup payload round-trips and rejects tampering', () => {
  const key = getBackupKey('a'.repeat(64));
  const payload = Buffer.from('synthetic MongoDB archive fixture');
  const encrypted = encryptBuffer(payload, key);

  assert.deepEqual(decryptBuffer(encrypted, key), payload);
  encrypted[encrypted.length - 1] ^= 0x01;
  assert.throws(() => decryptBuffer(encrypted, key));
});

test('streamed backup encrypts atomically and authenticates before exposing plaintext', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'adaptiq-backup-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const key = getBackupKey('b'.repeat(64));
  const archivePath = path.join(directory, 'backup.enc');
  const plaintextPath = path.join(directory, 'restored.archive');
  const payload = crypto.randomBytes(1024);

  await encryptStreamToArchive(Readable.from([payload.subarray(0, 400), payload.subarray(400)]), archivePath, key);
  await decryptArchiveToFile(archivePath, plaintextPath, key);
  assert.deepEqual(await fs.readFile(plaintextPath), payload);
  await assert.rejects(
    encryptStreamToArchive(Readable.from([Buffer.from('overwrite')]), archivePath, key),
    /already exists/,
  );
  assert.deepEqual(await fs.readFile(archivePath).then((archive) => decryptBuffer(archive, key)), payload);

  const tamperedArchivePath = path.join(directory, 'tampered.enc');
  const tamperedArchive = await fs.readFile(archivePath);
  tamperedArchive[tamperedArchive.length - 1] ^= 0x01;
  await fs.writeFile(tamperedArchivePath, tamperedArchive);
  const tamperedPlaintextPath = path.join(directory, 'tampered.archive');
  await assert.rejects(decryptArchiveToFile(tamperedArchivePath, tamperedPlaintextPath, key));
  await assert.rejects(fs.access(tamperedPlaintextPath));
});

test('restore target must be a different named database', () => {
  assert.deepEqual(assertSafeRestoreTarget(sourceUri, targetUri), {
    sourceDatabase: 'adaptiq_backup_source',
    targetDatabase: 'adaptiq_backup_target',
  });
  assert.throws(
    () => assertSafeRestoreTarget(sourceUri, 'mongodb://localhost:27017/adaptiq_backup_source'),
    /must not be the source database/,
  );
});

test('drill URI checks accept loopback only and parse multi-host Mongo URIs', () => {
  assert.equal(isLoopbackMongoUri(sourceUri), true);
  assert.equal(isLoopbackMongoUri('mongodb://db.example:27017/adaptiq_test'), false);
  assert.deepEqual(
    parseMongoUri('mongodb://user:pass@db-a:27017,db-b:27017/adaptiq_test?tls=true'),
    { database: 'adaptiq_test', hosts: ['db-a:27017', 'db-b:27017'] },
  );
});

test('backup key must be 32 bytes encoded as hexadecimal', () => {
  assert.throws(() => getBackupKey('not-a-key'), /64 hexadecimal characters/);
});
