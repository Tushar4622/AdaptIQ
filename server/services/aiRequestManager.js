const crypto = require('crypto');

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 250;
const MIN_REQUEST_GAP_MS = 750;
const MAX_ATTEMPTS = 3;
const MAX_PENDING_REQUESTS = 20;

const responseCache = new Map();
const inFlightRequests = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;
let pendingRequests = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStatus = (error) => Number(
  error?.status || error?.statusCode || error?.response?.status || 0
);

const getRetryAfterMs = (error) => {
  const headers = error?.response?.headers || error?.headers || {};
  const value = headers['retry-after'] || headers['Retry-After'];
  if (!value) return 0;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? 0 : Math.max(0, dateMs - Date.now());
};

const enqueue = (request) => {
  if (pendingRequests >= MAX_PENDING_REQUESTS) {
    const error = new Error('AI is busy. Too many requests are queued; please retry shortly.');
    error.statusCode = 503;
    return Promise.reject(error);
  }
  pendingRequests += 1;

  const queuedRequest = requestQueue.then(async () => {
    const waitMs = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
    if (waitMs > 0) await sleep(waitMs);
    lastRequestAt = Date.now();
    return request();
  });

  requestQueue = queuedRequest.catch(() => undefined);
  return queuedRequest.finally(() => {
    pendingRequests -= 1;
  });
};

const generateWithBackoff = async (model, prompt) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      const status = getStatus(error);
      const retryable = !status || [408, 429, 500, 502, 503, 504].includes(status);
      if (!retryable || attempt === MAX_ATTEMPTS) {
        if (status === 429) error.retryAfterMs = getRetryAfterMs(error);
        throw error;
      }

      const backoffMs = 800 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      await sleep(Math.max(backoffMs, getRetryAfterMs(error)));
    }
  }
};

const trimCache = () => {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }
  while (responseCache.size >= MAX_CACHE_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
};

exports.generateAIContent = (model, prompt) => {
  const modelName = String(model?.model || 'gemini');
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${modelName}\n${prompt}`)
    .digest('hex');
  const cached = responseCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
  if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey);

  const request = enqueue(() => generateWithBackoff(model, prompt))
    .then((value) => {
      trimCache();
      responseCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .finally(() => inFlightRequests.delete(cacheKey));

  inFlightRequests.set(cacheKey, request);
  return request;
};