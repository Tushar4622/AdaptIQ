import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const LEGACY_ACCESS_TOKEN_KEY = 'token';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

let accessToken: string | null = null;
let csrfToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const resetCsrfToken = () => {
  csrfToken = null;
};

const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  const { data } = await axios.get(`${API_BASE_URL}/auth/csrf`, {
    withCredentials: true,
  });
  csrfToken = data.csrfToken;
  return csrfToken;
};

export const getCsrfHeaders = async () => ({
  'X-CSRF-Token': await getCsrfToken(),
  'X-Auth-Token-Mode': 'cookie',
});

export const refreshAccessToken = async () => {
  const headers = await getCsrfHeaders();
  const request = (refreshToken?: string) =>
    axios.post(
      `${API_BASE_URL}/auth/refresh`,
      refreshToken ? { refreshToken } : {},
      { withCredentials: true, headers }
    );

  let response;
  try {
    response = await request();
  } catch (error) {
    const legacyRefreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    if (
      !legacyRefreshToken ||
      !axios.isAxiosError(error) ||
      error.response?.status !== 401
    ) {
      throw error;
    }
    try {
      response = await request(legacyRefreshToken);
    } catch (legacyError) {
      if (
        axios.isAxiosError(legacyError) &&
        legacyError.response?.status === 401
      ) {
        localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
        localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
      }
      throw legacyError;
    }
  }

  setAccessToken(response.data.token);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  return response.data.token as string;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = String(original?.url || '');

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      original &&
      !original._retry &&
      !url.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const token = await refreshAccessToken();
        processQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        setAccessToken(null);
        const appBase = /^\/adaptiq(?:\/|$)/i.test(window.location.pathname) ? '/adaptiq' : '';
        window.location.href = `${appBase}/login`;
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
