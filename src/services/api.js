import axios from 'axios';

const getApiBaseUrl = () => {
  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && (envApi.startsWith('http://') || envApi.startsWith('https://'))) {
    return envApi.replace(/\/+$/, '');
  }

  const envBackend = import.meta.env.VITE_BACKEND_URL;
  if (envBackend && (envBackend.startsWith('http://') || envBackend.startsWith('https://'))) {
    return `${envBackend.replace(/\/+$/, '')}/api`;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }
  }

  return 'https://core.ishdaman.uz/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // JWT Bearer token auth - no cookies needed
});

// Attach JWT access token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('th_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401/403 - clear stale token so AuthContext re-authenticates on next render
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    // Only clear token on 401 (Invalid/expired token), NEVER on 403 (Forbidden/Banned)
    if (status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      if (!isAuthEndpoint) {
        console.warn('[api] Token invalid or expired (status 401), clearing...');
        localStorage.removeItem('th_access_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
