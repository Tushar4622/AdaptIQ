const crypto = require('crypto');

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const getRefreshCookieOptions = (isProduction = process.env.NODE_ENV === 'production') => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: REFRESH_COOKIE_MAX_AGE,
});

const getCsrfCookieOptions = (isProduction = process.env.NODE_ENV === 'production') => ({
  httpOnly: false,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
  maxAge: REFRESH_COOKIE_MAX_AGE,
});

const setCsrfCookie = (res, csrfToken = crypto.randomBytes(32).toString('base64url')) => {
  res.cookie('csrfToken', csrfToken, getCsrfCookieOptions());
  return csrfToken;
};

const setAuthCookies = (res, refreshToken, csrfToken = crypto.randomBytes(32).toString('base64url')) => {
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
  setCsrfCookie(res, csrfToken);
  return csrfToken;
};

const clearAuthCookies = (res) => {
  const refreshOptions = getRefreshCookieOptions();
  const csrfOptions = getCsrfCookieOptions();
  delete refreshOptions.maxAge;
  delete csrfOptions.maxAge;
  res.clearCookie('refreshToken', refreshOptions);
  res.clearCookie('csrfToken', csrfOptions);
};

module.exports = {
  clearAuthCookies,
  getCsrfCookieOptions,
  getRefreshCookieOptions,
  setAuthCookies,
  setCsrfCookie,
};
