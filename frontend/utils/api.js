import axios from 'axios';

const protocol = import.meta.env.VITE_PROTOCOLE || 'http';
const host = (import.meta.env.VITE_SERVER_HOST || 'localhost').replace(/\/+$/, '').trim();
const portRaw = import.meta.env.VITE_SERVER_PORT;
const port = portRaw !== undefined && portRaw !== '' ? String(portRaw).trim() : (host === 'localhost' ? '8080' : '');

let baseURL;
if (!port || port === '443' || port === '80') {
  baseURL = `${protocol}://${host}`;
} else {
  baseURL = `${protocol}://${host}:${port}`;
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_KEY = 'token';

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/google', '/api/auth/refresh'];
function isAuthRequest(config) {
  const url = config?.url || '';
  return authPaths.some((path) => url.includes(path));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    if (isAuthRequest(originalRequest)) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    if (originalRequest._retry) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    try {
      const { data } = await axios.post(`${baseURL}/api/auth/refresh`, { refreshToken });
      if (data.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      }
    } catch (refreshError) {
      // ignore
    }
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY, getAccessToken, getRefreshToken, clearAuth };
