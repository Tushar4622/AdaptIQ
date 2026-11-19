const path = require('path');

exports.loadFaceVerifier = () => {
  const moduleName = String(process.env.FACE_VERIFIER_MODULE || '').trim();
  if (!moduleName) return null;

  const modulePath = moduleName.startsWith('.')
    ? path.resolve(process.cwd(), moduleName)
    : moduleName;
  const imported = require(modulePath);
  const verifier = imported.default || imported;
  if (typeof verifier.enroll !== 'function' || typeof verifier.verify !== 'function') {
    throw new Error('Configured face verifier must export enroll() and verify() functions.');
  }
  if (typeof verifier.validateConfig === 'function') verifier.validateConfig();
  return verifier;
};