const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  authSchemas,
  JSON_BODY_LIMIT,
  MAX_ARRAY_LENGTH,
  MAX_BODY_DEPTH,
  MAX_FACE_IMAGE_LENGTH,
  MAX_STRING_LENGTH,
  faceEnrollmentBodySchema,
  requestBodySchema,
  validateRequestBody,
} = require('../middleware/requestValidation');
const { validatePagination, MAX_PAGE_SIZE } = require('../middleware/paginationValidation');
const errorHandler = require('../middleware/errorHandler');
const requestId = require('../middleware/requestId');

const invoke = async (middleware, req) => {
  const res = {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled, req };
};

test('Zod rejects oversized strings, deeply nested objects, and excessive array items', () => {
  assert.equal(
    requestBodySchema.safeParse({ rawSourceText: 'x'.repeat(MAX_STRING_LENGTH + 1) }).success,
    false
  );
  assert.equal(
    faceEnrollmentBodySchema.safeParse({
      photos: ['x'.repeat(MAX_STRING_LENGTH + 1)],
    }).success,
    true
  );
  assert.equal(
    faceEnrollmentBodySchema.safeParse({
      photos: ['x'.repeat(MAX_FACE_IMAGE_LENGTH + 1)],
    }).success,
    false
  );
  assert.equal(
    requestBodySchema.safeParse({
      items: Array.from({ length: MAX_ARRAY_LENGTH + 1 }, () => 'x'),
    }).success,
    false
  );

  let deeplyNested = {};
  for (let index = 0; index <= MAX_BODY_DEPTH; index += 1) {
    deeplyNested = { nested: deeplyNested };
  }
  assert.equal(
    requestBodySchema.safeParse(deeplyNested).success,
    false
  );
});

test('body middleware rejects non-object JSON values and returns safe issue details', async () => {
  const { res, nextCalled } = await invoke(validateRequestBody, {
    method: 'POST',
    body: 'not-an-object',
  });
  assert.equal(res.statusCode, 422);
  assert.equal(nextCalled, false);
  assert.equal(res.body.error, 'Invalid request body.');
  assert.equal(typeof res.body.issues[0].message, 'string');
});

test('auth schemas reject invalid fields and normalize valid email addresses', () => {
  assert.equal(
    authSchemas.register.safeParse({
      name: 'Student',
      email: 'student@example.com',
      password: 'valid-password',
      role: 'admin',
    }).success,
    false
  );

  const parsed = authSchemas.login.parse({
    email: '  STUDENT@example.com ',
    password: 'valid-password',
  });
  assert.equal(parsed.email, 'student@example.com');
});

test('pagination rejects oversized page sizes and malformed values', async () => {
  const invalidLimit = await invoke(validatePagination, {
    method: 'GET',
    query: { limit: String(MAX_PAGE_SIZE + 1) },
  });
  assert.equal(invalidLimit.res.statusCode, 400);
  assert.equal(invalidLimit.nextCalled, false);

  const malformedPage = await invoke(validatePagination, {
    method: 'GET',
    query: { page: '10001' },
  });
  assert.equal(malformedPage.res.statusCode, 400);
  assert.equal(malformedPage.nextCalled, false);

  const validPagination = await invoke(validatePagination, {
    method: 'GET',
    query: { page: '2', limit: String(MAX_PAGE_SIZE) },
  });
  assert.equal(validPagination.nextCalled, true);
});

test('body validator rejects non-JSON request content types', async () => {
  const { res, nextCalled } = await invoke(validateRequestBody, {
    method: 'POST',
    originalUrl: '/api/courses',
    body: undefined,
    get(name) {
      return name.toLowerCase() === 'content-length' ? '8' : undefined;
    },
    is: () => false,
  });
  assert.equal(res.statusCode, 415);
  assert.equal(nextCalled, false);
});

test('multipart assignment fields are validated after the upload parser runs', async () => {
  const { res, nextCalled } = await invoke(validateRequestBody, {
    method: 'POST',
    originalUrl: '/api/assignments/upload',
    body: { caption: 'valid upload field' },
    files: [],
    get(name) {
      return name.toLowerCase() === 'content-length' ? '128' : undefined;
    },
    is(type) {
      return type === 'multipart/form-data' ? type : false;
    },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
});

test('express JSON parser rejects bodies above the configured limit with HTTP 413', async (t) => {
  const app = express();
  app.use(requestId);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.post('/', validateRequestBody, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(1024 * 1024) }),
  });
  await response.text();
  assert.equal(response.status, 413);
  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i);
});
