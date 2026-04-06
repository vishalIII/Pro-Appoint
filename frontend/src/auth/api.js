import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ✅ required for cookies
});

// ===============================
// Token storage (accessToken only)
// ===============================
export const getAccessToken = () => localStorage.getItem('accessToken');

export const setAccessToken = (accessToken) => {
  localStorage.setItem('accessToken', accessToken);
};

// Refresh token fallback storage (used only if cookies are blocked)
export const getRefreshToken = () => localStorage.getItem('refreshToken');

export const setRefreshToken = (refreshToken) => {
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// ===============================
// Refresh handling
// ===============================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

const refreshTokens = async () => {
  const refreshToken = getRefreshToken();

  console.info("[auth] Attempting token refresh", {
    hasRefreshToken: Boolean(refreshToken),
  });

  const res = await api.post(
    '/auth/refresh-token',
    {},
    refreshToken ? { headers: { Authorization: `Bearer ${refreshToken}` } } : undefined,
  );

  const newAccessToken = res.data?.accessToken;
  const newRefreshToken = res.data?.refreshToken;

  if (newAccessToken) setAccessToken(newAccessToken);
  if (newRefreshToken) setRefreshToken(newRefreshToken);

  console.info("[auth] Token refresh success");

  return newAccessToken;
};

// ===============================
// Request interceptor
// ===============================
api.interceptors.request.use(
  (config) => {
    // Respect an explicit Authorization header (used for refresh-token call)
    if (config.headers && config.headers.Authorization) {
      return config;
    }

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ===============================
// Response interceptor (FIXED)
// ===============================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;
    const isLoginOrRegister = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');

    // ❗ handle only auth errors + avoid infinite loop
    if (isAuthError && !originalRequest._retry && !isLoginOrRegister && !originalRequest.url?.includes('refresh-token')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshTokens();

        processQueue(null, newAccessToken);

        if (newAccessToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        console.warn("[auth] Refresh failed", refreshError?.message || refreshError);
        processQueue(refreshError, null);
        clearTokens();

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
