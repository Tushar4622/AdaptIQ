const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  MAX_ASSIGNMENT_FILE_SIZE,
  processUploadedFiles,
} = require('../services/assignmentUploads');
const { createClamAvScanner } = require('../services/clamAvScanner');

const createTempDirectory = async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'adaptiq-upload-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
};

const writeStagedFile = async (directory, contents) => {
  const filePath = path.join(directory, 'staged-upload');
  await fs.writeFile(filePath, contents);
  return filePath;
};

test('rejects an executable disguised as a PDF and removes the staged file', async (t) => {
  const directory = await createTempDirectory(t);
  const executable = Buffer.alloc(512);
  executable.write('MZ', 0);
  executable.writeUInt32LE(0x80, 0x3c);
  executable.write('PE\u0000\u0000', 0x80, 'binary');
  executable.writeUInt16LE(0x8664, 0x84);
  const filePath = await writeStagedFile(directory, executable);

  await assert.rejects(
    processUploadedFiles(
      [{
        path: filePath,
        originalname: 'course-notes.pdf',
        mimetype: 'application/pdf',
        size: executable.length,
      }],
      {
        storageDirectory: path.join(directory, 'private'),
        scanFile: async () => ({ scanned: true }),
      }
    ),
    { code: 'UNSUPPORTED_FILE_TYPE', statusCode: 415 }
  );

  await assert.rejects(fs.stat(filePath), { code: 'ENOENT' });
  assert.deepEqual(await fs.readdir(path.join(directory, 'private')), []);
});

test('uses detected type and random server filename instead of client metadata', async (t) => {
  const directory = await createTempDirectory(t);
  const contents = Buffer.from('%PDF-1.7\nOriginal PDF test fixture');
  const filePath = await writeStagedFile(directory, contents);
  let scannedPath;

  const [storedFile] = await processUploadedFiles(
    [{
      path: filePath,
      originalname: 'image.png',
      mimetype: 'image/png',
      size: contents.length,
    }],
    {
      storageDirectory: path.join(directory, 'private'),
      scanFile: async (target) => { scannedPath = target; },
    }
  );

  assert.match(storedFile.fileName, /^[0-9a-f-]{36}\.pdf$/i);
  assert.notEqual(storedFile.fileName, 'image.png');
  assert.equal(storedFile.mimeType, 'application/pdf');
  assert.equal(storedFile.extension, 'pdf');
  assert.equal(scannedPath, filePath);
  assert.deepEqual(await fs.readFile(storedFile.path), contents);
});

test('rejects files that exceed the upload size cap', async (t) => {
  const directory = await createTempDirectory(t);
  const filePath = await writeStagedFile(directory, Buffer.from('unused'));

  await assert.rejects(
    processUploadedFiles(
      [{ path: filePath, size: MAX_ASSIGNMENT_FILE_SIZE + 1 }],
      {
        storageDirectory: path.join(directory, 'private'),
        scanFile: async () => ({ scanned: true }),
      }
    ),
    { code: 'FILE_SIZE_LIMIT', statusCode: 413 }
  );
  await assert.rejects(fs.stat(filePath), { code: 'ENOENT' });
});

test('ClamAV can be disabled for development without invoking the scanner', async () => {
  let executionCount = 0;
  const scanFile = createClamAvScanner({
    enabled: false,
    execute: async () => { executionCount += 1; },
  });

  assert.deepEqual(await scanFile('unused-file'), { scanned: false });
  assert.equal(executionCount, 0);
});

test('ClamAV rejects infected files and fails closed when unavailable', async () => {
  const infectedScanner = createClamAvScanner({
    enabled: true,
    execute: async () => {
      throw Object.assign(new Error('infected'), {
        code: 1,
        stdout: 'sample.exe: Malware FOUND',
        stderr: '',
      });
    },
  });
  await assert.rejects(infectedScanner('sample.exe'), {
    code: 'MALWARE_DETECTED',
    statusCode: 422,
  });

  const unavailableScanner = createClamAvScanner({
    enabled: true,
    execute: async () => { throw Object.assign(new Error('not installed'), { code: 'ENOENT' }); },
  });
  await assert.rejects(unavailableScanner('sample.pdf'), {
    code: 'MALWARE_SCANNER_UNAVAILABLE',
    statusCode: 503,
  });
});
