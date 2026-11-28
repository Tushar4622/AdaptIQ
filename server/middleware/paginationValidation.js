const { z } = require('zod');

const MAX_PAGE = 10_000;
const MAX_PAGE_SIZE = 100;

const optionalPositiveInteger = (max) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string' || !/^\d+$/.test(value)) return value;
      return Number(value);
    },
    z.number().int().min(1).max(max).optional()
  );

const paginationQuerySchema = z.object({
  page: optionalPositiveInteger(MAX_PAGE),
  limit: optionalPositiveInteger(MAX_PAGE_SIZE),
});

const validatePagination = (req, res, next) => {
  if (req.method !== 'GET' || (req.query.page === undefined && req.query.limit === undefined)) {
    return next();
  }

  const parsed = paginationQuerySchema.safeParse({
    page: req.query.page,
    limit: req.query.limit,
  });
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid pagination parameters.',
      issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    });
  }
  return next();
};

module.exports = {
  MAX_PAGE,
  MAX_PAGE_SIZE,
  paginationQuerySchema,
  validatePagination,
};
