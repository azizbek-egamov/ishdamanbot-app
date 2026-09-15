import axios from 'axios';

// Always use relative /api path so Vite proxy handles it (avoids CORS entirely)
const api = axios.create({
  baseURL: '/api',
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
