// Raw fetch-based auth calls — intentionally avoids importing the axios
// instance from api.js to prevent circular dependency.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function authFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // sends/receives the httpOnly refresh_token cookie
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw data; // throw the error payload so callers can read .error / .code
  return data;
}

export const apiLogin = (email, password) =>
  authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const apiRegister = (email, password) =>
  authFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

/** Called on page load and by the 401 interceptor. Cookie is sent automatically. */
export const apiRefresh = () =>
  authFetch('/api/auth/refresh', { method: 'POST' });

export const apiLogout = () =>
  authFetch('/api/auth/logout', { method: 'POST' });
