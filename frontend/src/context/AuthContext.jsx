import React, { createContext, useState, useEffect, useContext } from 'react';
import authStore from '../services/authStore';
import { apiLogin, apiRegister, apiRefresh, apiLogout } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: attempt to restore session from the httpOnly refresh cookie.
  // No Supabase, no localStorage — the cookie is the source of truth.
  useEffect(() => {
    apiRefresh()
      .then(({ access_token, user: userData }) => {
        authStore.accessToken = access_token;
        setUser(userData);
      })
      .catch(() => {
        // No valid cookie → not logged in. Silently do nothing.
        authStore.accessToken = null;
        setUser(null);
      })
      .finally(() => setLoading(false));

    // The 401 interceptor in api.js dispatches this when all refresh retries fail.
    const handleForceLogout = () => {
      authStore.accessToken = null;
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    const { access_token, user: userData } = await apiLogin(email, password);
    authStore.accessToken = access_token;
    setUser(userData);
  };

  const register = async (email, password) => {
    const { access_token, user: userData } = await apiRegister(email, password);
    authStore.accessToken = access_token;
    setUser(userData);
  };

  const logout = async () => {
    await apiLogout().catch(() => {}); // best-effort — always clear local state
    authStore.accessToken = null;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
