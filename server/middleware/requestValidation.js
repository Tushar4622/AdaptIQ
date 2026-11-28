const { z } = require('zod');

const MAX_STRING_LENGTH = 100_000;
const MAX_FACE_IMAGE_LENGTH = 3_000_000;
const MAX_ARRAY_LENGTH = 500;
const MAX_OBJECT_KEYS = 200;
const MAX_OBJECT_KEY_LENGTH = 100;
const MAX_BODY_DEPTH = 12;
const JSON_BODY_LIMIT = '1mb';

const addIssue = (ctx, path, message) => {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
};

const createRequestBodySchema = (maxStringLength) =>
  z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).superRefine((value, ctx) => {
    const stack = [{ value, path: [], depth: 0 }];

    while (stack.length > 0) {
      const current = stack.pop();
      const { depth, path, value: currentValue } = current;
      if (depth > MAX_BODY_DEPTH) {
        addIssue(ctx, path, `Body nesting cannot exceed ${MAX_BODY_DEPTH} levels.`);
        continue;
      }

      if (typeof currentValue === 'string') {
        if (currentValue.length > maxStringLength) {
          addIssue(ctx, path, `Strings cannot exceed ${maxStringLength} characters.`);
        }
        continue;
      }
      if (
        currentValue === null ||
        typeof currentValue === 'boolean' ||
        (typeof currentValue === 'number' && Number.isFinite(currentValue))
      ) {
        continue;
      }

      if (Array.isArray(currentValue)) {
        if (currentValue.length > MAX_ARRAY_LENGTH) {
          addIssue(ctx, path, `Arrays cannot contain more than ${MAX_ARRAY_LENGTH} items.`);
        }
        currentValue.slice(0, MAX_ARRAY_LENGTH).forEach((item, index) => {
          stack.push({ value: item, path: [...path, index], depth: depth + 1 });
        });
        continue;
      }

      if (typeof currentValue === 'object' && currentValue !== null) {
        const entries = Object.entries(currentValue);
        if (entries.length > MAX_OBJECT_KEYS) {
          addIssue(ctx, path, `Objects cannot contain more than ${MAX_OBJECT_KEYS} fields.`);
        }
        entries.slice(0, MAX_OBJECT_KEYS).forEach(([key, item]) => {
          if (key.length > MAX_OBJECT_KEY_LENGTH) {
            addIssue(ctx, [...path, key], `Field names cannot exceed ${MAX_OBJECT_KEY_LENGTH} characters.`);
          }
          if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
            addIssue(ctx, [...path, key], 'This field name is not allowed.');
            return;
          }
          stack.push({ value: item, path: [...path, key], depth: depth + 1 });
        });
        continue;
      }

      addIssue(ctx, path, 'Body values must be valid JSON values.');
    }
  });

const requestBodySchema = createRequestBodySchema(MAX_STRING_LENGTH);
const faceEnrollmentBodySchema = createRequestBodySchema(MAX_FACE_IMAGE_LENGTH);

const formatIssues = (issues) =>
  issues.map(({ path, message }) => ({ path: path.join('.'), message }));

const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'Invalid request body.',
      issues: formatIssues(parsed.error.issues),
    });
  }
  req.body = parsed.data;
  return next();
};

const validateRequestBody = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const contentLength = Number(req.get?.('content-length') || 0);
  const hasBody = contentLength > 0 || Boolean(req.get?.('transfer-encoding'));
  if (hasBody && typeof req.is === 'function') {
    const isMultipart = Boolean(req.is('multipart/form-data'));
    const requestPath = req.originalUrl?.split('?')[0].replace(/\/+$/, '');
    const isAssignmentUpload = requestPath === '/api/assignments/upload';
    if (isMultipart && isAssignmentUpload) {
      if (req.files === undefined) return next();
    } else if (
      isMultipart ||
      !req.is(['application/json', 'application/x-www-form-urlencoded'])
    ) {
      return res.status(415).json({ error: 'Unsupported request content type.' });
    }
  }

  if (req.body === undefined) return next();
  const requestPath = req.originalUrl?.split('?')[0].replace(/\/+$/, '');
  const isFaceEnrollment = requestPath === '/api/attendance/face/enroll';
  return validateBody(isFaceEnrollment ? faceEnrollmentBodySchema : requestBodySchema)(
    req,
    res,
    next
  );
};

const emailSchema = z.string().trim().max(254).email().transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(12).max(72).superRefine((password, ctx) => {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    addIssue(ctx, [], 'Password must be no more than 72 UTF-8 bytes.');
  }
  if (!/[a-z]/.test(password)) addIssue(ctx, [], 'Password must include a lowercase letter.');
  if (!/[A-Z]/.test(password)) addIssue(ctx, [], 'Password must include an uppercase letter.');
  if (!/\d/.test(password)) addIssue(ctx, [], 'Password must include a number.');
  if (!/[^A-Za-z0-9]/.test(password)) addIssue(ctx, [], 'Password must include a symbol.');
});

const authSchemas = {
  register: z.object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['student', 'teacher']).optional(),
    institution: z.string().trim().max(160).optional(),
  }).strict(),
  login: z.object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  }).strict(),
  refresh: z.object({
    refreshToken: z.string().min(1).max(4096).optional(),
  }).strict().optional().transform((body) => body || {}),
  logout: z.object({
    refreshToken: z.string().min(1).max(4096).optional(),
  }).strict().optional().transform((body) => body || {}),
  mfaSetup: z.object({
    setupToken: z.string().min(1).max(8192),
  }).strict(),
  mfaSetupVerify: z.object({
    setupToken: z.string().min(1).max(8192),
    code: z.string().regex(/^\d{6}$/),
  }).strict(),
  mfaVerify: z.object({
    challengeToken: z.string().min(1).max(8192),
    code: z.string().regex(/^\d{6}$/).optional(),
    recoveryCode: z.string().regex(/^[A-F\d]{6}(?:-[A-F\d]{6}){3}$/i).optional(),
  }).strict().refine(
    ({ code, recoveryCode }) => Boolean(code) !== Boolean(recoveryCode),
    'Provide exactly one authenticator or recovery code.'
  ),
};

const adminRoleBodySchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']),
}).strict();

module.exports = {
  MAX_ARRAY_LENGTH,
  MAX_BODY_DEPTH,
  MAX_FACE_IMAGE_LENGTH,
  MAX_OBJECT_KEYS,
  MAX_OBJECT_KEY_LENGTH,
  MAX_STRING_LENGTH,
  JSON_BODY_LIMIT,
  adminRoleBodySchema,
  authSchemas,
  faceEnrollmentBodySchema,
  requestBodySchema,
  validateBody,
  validateRequestBody,
};
