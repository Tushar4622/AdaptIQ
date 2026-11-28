const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const ASSIGNMENT_UPLOAD_DIR = path.resolve(__dirname, '..', 'private_uploads', 'assignments');
const MAX_ASSIGNMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ASSIGNMENT_FILES = 8;
const ALLOWED_FILE_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]);

class UploadError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'UploadError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const detectFileType = async (filePath) => {
  const { fileTypeFromFile } = await import('file-type');
  return fileTypeFromFile(filePath);
};

const removeFiles = async (filePaths) => {
  for (const filePath of new Set(filePaths.filter(Boolean))) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
};

const processUploadedFiles = async (
  files,
  {
    storageDirectory = ASSIGNMENT_UPLOAD_DIR,
    detect = detectFileType,
    scanFile,
  } = {}
) => {
  const finalizedFiles = [];
  try {
    if (files.length > MAX_ASSIGNMENT_FILES) {
      throw new UploadError('You can upload at most 8 files at a time.', 413, 'FILE_COUNT_LIMIT');
    }
    if (typeof scanFile !== 'function') {
      throw new TypeError('A malware scanning function is required to process uploaded files.');
    }

    await fs.mkdir(storageDirectory, { recursive: true, mode: 0o700 });

    for (const file of files) {
      if (file.size > MAX_ASSIGNMENT_FILE_SIZE) {
        throw new UploadError('Each file must be 10 MiB or smaller.', 413, 'FILE_SIZE_LIMIT');
      }

      const detectedType = await detect(file.path);
      const extension = ALLOWED_FILE_TYPES.get(detectedType?.mime);
      if (!extension || detectedType.ext !== extension) {
        throw new UploadError(
          'Unsupported file type. Upload a PDF, PNG, JPEG, or WebP file.',
          415,
          'UNSUPPORTED_FILE_TYPE'
        );
      }

      await scanFile(file.path);

      const fileName = `${crypto.randomUUID()}.${extension}`;
      const finalPath = path.join(storageDirectory, fileName);
      await fs.rename(file.path, finalPath);
      finalizedFiles.push({
        fileName,
        path: finalPath,
        size: file.size,
        mimeType: detectedType.mime,
        extension,
      });
    }

    return finalizedFiles;
  } catch (error) {
    try {
      await removeFiles([
        ...files.map((file) => file.path),
        ...finalizedFiles.map((file) => file.path),
      ]);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Upload processing failed and temporary-file cleanup was incomplete.'
      );
    }
    throw error;
  }
};

module.exports = {
  ALLOWED_FILE_TYPES,
  ASSIGNMENT_UPLOAD_DIR,
  MAX_ASSIGNMENT_FILE_SIZE,
  MAX_ASSIGNMENT_FILES,
  UploadError,
  processUploadedFiles,
};
