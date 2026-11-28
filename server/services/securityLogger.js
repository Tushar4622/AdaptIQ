const SAFE_DETAILS = new Set(['action', 'errorType', 'reason', 'role', 'statusCode']);
const SAFE_VALUE = /^[A-Za-z0-9_.:/()?-]{1,200}$/;

const getRouteTemplate = (req) => {
  const routePath = typeof req?.route?.path === 'string' ? req.route.path : '';
  const baseUrl = typeof req?.baseUrl === 'string' ? req.baseUrl : '';
  const route = `${baseUrl}${routePath}`;
  return route && SAFE_VALUE.test(route) ? route : undefined;
};

const logSecurityEvent = (event, req, details = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    requestId: req?.requestId || 'unavailable',
  };
  if (typeof req?.method === 'string' && SAFE_VALUE.test(req.method)) {
    entry.method = req.method;
  }

  const route = getRouteTemplate(req);
  if (route) entry.route = route;

  Object.entries(details).forEach(([key, value]) => {
    if (!SAFE_DETAILS.has(key)) return;
    if (key === 'statusCode') {
      if (Number.isInteger(value)) entry[key] = value;
      return;
    }
    if (typeof value === 'string' && SAFE_VALUE.test(value)) entry[key] = value;
  });

  const output = JSON.stringify(entry);
  if (event.startsWith('admin.')) console.info(output);
  else console.warn(output);
};

module.exports = { getRouteTemplate, logSecurityEvent };
