import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'caudal_token';

let accessToken = localStorage.getItem(TOKEN_KEY) || null;

export function getToken() {
  return accessToken;
}
export function setToken(token) {
  accessToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // send/receive the httponly refresh cookie
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- refresh handling (single-flight, queue concurrent 401s) ----
let refreshing = null;
let waiters = [];

function onRefreshed(token) {
  waiters.forEach((cb) => cb(token));
  waiters = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || config._retry) {
      return Promise.reject(error);
    }
    // never try to refresh the refresh/login calls themselves
    if (config.url?.includes('/api/auth/refresh') || config.url?.includes('/api/auth/login')) {
      return Promise.reject(error);
    }

    config._retry = true;

    if (!refreshing) {
      refreshing = axios
        .post(`${BASE}/api/auth/refresh`, {}, { withCredentials: true })
        .then((r) => {
          setToken(r.data.access_token);
          onRefreshed(r.data.access_token);
          return r.data.access_token;
        })
        .catch((err) => {
          setToken(null);
          onRefreshed(null);
          throw err;
        })
        .finally(() => {
          refreshing = null;
        });
    }

    return new Promise((resolve, reject) => {
      waiters.push((token) => {
        if (!token) {
          reject(error);
          return;
        }
        config.headers.Authorization = `Bearer ${token}`;
        resolve(api(config));
      });
      refreshing?.catch(() => {});
    });
  }
);

export default api;
