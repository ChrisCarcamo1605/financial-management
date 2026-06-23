import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setToken, getToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // bootstrap: if we have a token, fetch the current user
  useEffect(() => {
    let active = true;
    async function boot() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/api/auth/me');
        if (active) setUser(data);
      } catch {
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    boot();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/register', { email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
