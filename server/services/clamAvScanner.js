const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const executeFile = promisify(execFile);

const isScannerEnabled = () => {
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.CLAMAV_ENABLED === 'true';
};

const createClamAvScanner = ({
  enabled = isScannerEnabled(),
  command = process.env.CLAMSCAN_PATH || 'clamscan',
  execute = executeFile,
} = {}) => async (filePath) => {
  if (!enabled) return { scanned: false };

  try {
    await execute(command, ['--no-summary', filePath], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    return { scanned: true };
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    if (Number(error.code) === 1 && /\bFOUND\b/i.test(output)) {
      const infectedError = new Error('The uploaded file was rejected by the malware scanner.');
      infectedError.statusCode = 422;
      infectedError.code = 'MALWARE_DETECTED';
      throw infectedError;
    }

    const scannerError = new Error('The malware scanner is unavailable; the upload was rejected.');
    scannerError.statusCode = 503;
    scannerError.code = 'MALWARE_SCANNER_UNAVAILABLE';
    scannerError.cause = error;
    throw scannerError;
  }
};

module.exports = { createClamAvScanner, isScannerEnabled };
