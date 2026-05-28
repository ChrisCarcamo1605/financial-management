import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { getMe } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Escuchar cambios de autenticación de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token) {
          setToken(session.access_token);
          localStorage.setItem('token', session.access_token);
          try {
            const response = await getMe();
            setUser(response.data);
          } catch (error) {
            console.error('Error fetching user:', error);
          }
        } else {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
        setLoading(false);
      }
    );

    // Verificar sesión existente
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
        try {
          const response = await getMe();
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!data.user?.email_confirmed_at) {
      throw { error_description: 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' };
    }

    if (data.session?.access_token) {
      setToken(data.session.access_token);
      localStorage.setItem('token', data.session.access_token);
      const response = await getMe();
      setUser(response.data);
    }

    return data;
  };

  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
