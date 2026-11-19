const isLocalHost = (hostname) => ['localhost', '127.0.0.1', '::1'].includes(hostname);

const getConfig = () => {
  const verifierUrl = String(process.env.FACE_VERIFIER_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');
  const token = String(process.env.FACE_VERIFIER_API_TOKEN || '').trim();
  const parsedUrl = new URL(verifierUrl);
  if (parsedUrl.protocol !== 'https:' && !isLocalHost(parsedUrl.hostname)) {
    throw new Error('FACE_VERIFIER_URL must use HTTPS except for localhost.');
  }
  if (!token) throw new Error('FACE_VERIFIER_API_TOKEN is required to enable face verification.');
  return { verifierUrl, token };
};

const post = async (endpoint, body) => {
  const { verifierUrl, token } = getConfig();
  const response = await fetch(`${verifierUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.detail || 'Face verification service failed.');
    error.statusCode = response.status;
    throw error;
  }
  return payload;
};

exports.validateConfig = () => getConfig();
exports.enroll = ({ userId, role, photos }) => post('/enroll', { userId, role, photos });

exports.verify = ({ userId, images, templates, modelVersion, challenge }) =>
  post('/verify', { userId, images, templates, modelVersion, challenge });
