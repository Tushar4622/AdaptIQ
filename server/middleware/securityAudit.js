const { logSecurityEvent } = require('../services/securityLogger');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const auditDeniedRequests = (req, res, next) => {
  res.once('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent('request.denied', req, { statusCode: res.statusCode });
    }
  });
  next();
};

const auditAdminActions = (req, res, next) => {
  if (MUTATING_METHODS.has(req.method)) {
    res.once('finish', () => {
      logSecurityEvent('admin.action', req, {
        role: req.user?.role,
        statusCode: res.statusCode,
      });
    });
  }
  next();
};

module.exports = { auditAdminActions, auditDeniedRequests };
