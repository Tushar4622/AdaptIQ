require('dotenv').config();
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { getMongoOptions } = require('../config/db');
const {
  assertSafeRestoreTarget,
  decryptArchiveToFile,
  encryptStreamToArchive,
  getBackupKey,
  isLoopbackMongoUri,
  parseMongoUri,
  sameMongoDatabase,
} = require('../services/databaseBackup');

const createToolConfig = async (uri) => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'adaptiq-mongotool-'));
  try {
    const configPath = path.join(directory, 'connection.yml');
    const options = getMongoOptions({ mongoUri: uri });
    const hasTlsOption = /[?&](?:tls|ssl)=true(?:&|$)/i.test(uri);
    const toolUri = options.tls && !hasTlsOption
      ? `${uri}${uri.includes('?') ? '&' : '?'}tls=true`
      : uri;
    await fsp.writeFile(configPath, `uri: ${JSON.stringify(toolUri)}\n`, { flag: 'wx', mode: 0o600 });
    return { directory, configPath };
  } catch (error) {
    await fsp.rm(directory, { recursive: true, force: true });
    throw error;
  }
};

const waitForTool = (child) => new Promise((resolve, reject) => {
  child.once('error', (error) => {
    reject(error.code === 'ENOENT'
      ? new Error('MongoDB Database Tools are required; install mongodump and mongorestore.')
      : new Error(`MongoDB tool could not start (${error.code || error.name}).`));
  });
  child.once('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`MongoDB tool failed with exit code ${code}.`));
  });
});

const runDump = async (uri, outputPath, key) => {
  const { configPath, directory } = await createToolConfig(uri);
  const child = spawn(process.env.MONGODUMP_PATH || 'mongodump', [
    '--config', configPath, '--archive', '--gzip',
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let archiveCreated = false;
  const encryption = encryptStreamToArchive(child.stdout, outputPath, key)
    .then(() => { archiveCreated = true; });
  const toolExit = waitForTool(child);
  try {
    await Promise.all([encryption, toolExit]);
  } catch (error) {
    child.kill();
    await Promise.allSettled([encryption, toolExit]);
    if (archiveCreated) await fsp.rm(outputPath, { force: true });
    throw error;
  } finally {
    await fsp.rm(directory, { recursive: true, force: true });
  }
};

const getDatabaseCollections = async (uri) => {
  const connection = await mongoose.createConnection(uri, getMongoOptions({ mongoUri: uri })).asPromise();
  try {
    return await connection.db.listCollections({}, { nameOnly: true }).toArray();
  } finally {
    await connection.close();
  }
};

const restoreArchive = async (archivePath, sourceUri, targetUri, key) => {
  const { sourceDatabase, targetDatabase } = assertSafeRestoreTarget(sourceUri, targetUri);
  if ((await getDatabaseCollections(targetUri)).length > 0) {
    throw new Error('Restore target database must be empty; no collections were changed.');
  }

  const temporaryDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), 'adaptiq-restore-'));
  const plaintextPath = path.join(temporaryDirectory, 'authenticated.archive');
  let configDirectory;
  try {
    const config = await createToolConfig(targetUri);
    configDirectory = config.directory;
    await decryptArchiveToFile(archivePath, plaintextPath, key);
    const child = spawn(process.env.MONGORESTORE_PATH || 'mongorestore', [
      '--config', config.configPath,
      `--archive=${plaintextPath}`,
      '--gzip',
      `--nsFrom=${sourceDatabase}.*`,
      `--nsTo=${targetDatabase}.*`,
      '--stopOnError',
    ], { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'] });
    await waitForTool(child);
  } finally {
    await fsp.rm(temporaryDirectory, { recursive: true, force: true });
    if (configDirectory) await fsp.rm(configDirectory, { recursive: true, force: true });
  }
};

const connectForDrill = async (uri) => mongoose.createConnection(
  uri,
  getMongoOptions({ mongoUri: uri }),
).asPromise();

const runRestoreDrill = async () => {
  const sourceUri = process.env.BACKUP_DRILL_SOURCE_URI;
  const targetUri = process.env.BACKUP_DRILL_TARGET_URI;
  const productionUri = process.env.MONGO_URI;
  if (!sourceUri || !targetUri) {
    throw new Error('Set BACKUP_DRILL_SOURCE_URI and BACKUP_DRILL_TARGET_URI to empty local test databases.');
  }
  if (!isLoopbackMongoUri(sourceUri) || !isLoopbackMongoUri(targetUri)) {
    throw new Error('Restore drills are restricted to loopback MongoDB hosts.');
  }
  assertSafeRestoreTarget(sourceUri, targetUri);
  const { database: sourceDatabase } = parseMongoUri(sourceUri);
  const { database: targetDatabase } = parseMongoUri(targetUri);
  if (
    !sourceDatabase.startsWith('adaptiq_backup_drill_') ||
    !targetDatabase.startsWith('adaptiq_backup_drill_')
  ) {
    throw new Error('Restore drill database names must start with adaptiq_backup_drill_.');
  }
  if (productionUri && (
    sameMongoDatabase(sourceUri, productionUri) ||
    sameMongoDatabase(targetUri, productionUri)
  )) {
    throw new Error('Restore drill databases must be separate from MONGO_URI.');
  }
  if ((await getDatabaseCollections(sourceUri)).length || (await getDatabaseCollections(targetUri)).length) {
    throw new Error('Restore drill requires both local test databases to be empty.');
  }

  const collectionName = `_backup_restore_drill_${crypto.randomBytes(8).toString('hex')}`;
  const marker = crypto.randomUUID();
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'adaptiq-drill-'));
  const archivePath = path.join(directory, 'drill.mongodump.enc');
  const key = getBackupKey();
  let sourceConnection;
  let targetConnection;
  try {
    sourceConnection = await connectForDrill(sourceUri);
    await sourceConnection.db.collection(collectionName).insertOne({ marker, createdAt: new Date() });
    await sourceConnection.close();
    sourceConnection = null;

    await runDump(sourceUri, archivePath, key);
    await restoreArchive(archivePath, sourceUri, targetUri, key);
    targetConnection = await connectForDrill(targetUri);
    const restored = await targetConnection.db.collection(collectionName).findOne({ marker });
    if (!restored) throw new Error('Restore drill did not find its verification record.');
    console.log('Encrypted backup and isolated MongoDB restore drill succeeded.');
  } finally {
    await sourceConnection?.close();
    if (targetConnection) await targetConnection.close();
    const sourceCleanup = await connectForDrill(sourceUri);
    try {
      await sourceCleanup.dropDatabase();
    } finally {
      await sourceCleanup.close();
    }
    const targetCleanup = await connectForDrill(targetUri);
    try {
      await targetCleanup.dropDatabase();
    } finally {
      await targetCleanup.close();
    }
    await fsp.rm(directory, { recursive: true, force: true });
  }
};

const main = async () => {
  const [command, archiveArg] = process.argv.slice(2);
  if (command === 'backup') {
    const uri = process.env.MONGO_URI;
    parseMongoUri(uri);
    const archivePath = archiveArg || path.join(
      process.cwd(),
      'backups',
      `adaptiq-${new Date().toISOString().replace(/[:.]/g, '-')}.mongodump.enc`,
    );
    await runDump(uri, archivePath, getBackupKey());
    console.log(`Encrypted MongoDB backup written to ${path.resolve(archivePath)}`);
    return;
  }
  if (command === 'restore') {
    const sourceUri = process.env.MONGO_URI;
    const targetUri = process.env.MONGO_RESTORE_URI;
    if (!archiveArg) throw new Error('Usage: npm run db:restore -- <encrypted-archive-path>');
    if (!targetUri) throw new Error('MONGO_RESTORE_URI must name a separate, empty restore database.');
    parseMongoUri(sourceUri);
    await restoreArchive(archiveArg, sourceUri, targetUri, getBackupKey());
    console.log('Encrypted MongoDB archive restored successfully.');
    return;
  }
  if (command === 'drill') {
    await runRestoreDrill();
    return;
  }
  throw new Error('Usage: databaseBackup.js <backup [path] | restore <path> | drill>');
};

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`[database backup] ${error?.message || error?.name || 'operation failed'}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { createToolConfig, getDatabaseCollections, restoreArchive, runDump, runRestoreDrill };
