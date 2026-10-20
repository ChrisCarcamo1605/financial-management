import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDataSource } from '@/data/provider';
import type { Credentials, User } from '@/data/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login(credentials: Credentials): Promise<void>;
  register(credentials: Credentials): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const source = useDataSource();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const endSession = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    source.auth.restore().then((session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });
    const unsubscribe = source.auth.onExpired(endSession);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [source, endSession]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    async login(credentials) {
      const session = await source.auth.login(credentials);
      setUser(session.user);
      setStatus('authenticated');
    },
    async register(credentials) {
      const session = await source.auth.register(credentials);
      setUser(session.user);
      setStatus('authenticated');
    },
    async logout() {
      try {
        await source.auth.logout();
      } finally {
        endSession();
      }
    },
  }), [status, user, source, endSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
