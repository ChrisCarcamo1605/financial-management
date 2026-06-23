import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

const DEFAULTS = { theme: 'dark', accent_color: '#10b981', currency: 'USD', date_format: 'YYYY-MM-DD' };
const CACHE_KEY = 'caudal_prefs';

export const ACCENT_OPTIONS = [
  '#10b981', '#8b5cf6', '#06b6d4', '#3b82f6', '#f59e0b', '#ec4899', '#f87171',
];

function applyPrefs(prefs) {
  const root = document.documentElement;
  root.style.setProperty('--accent', prefs.accent_color || DEFAULTS.accent_color);
  root.setAttribute('data-theme', prefs.theme || DEFAULTS.theme);
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') };
    } catch {
      return DEFAULTS;
    }
  });
  const saveTimer = useRef(null);

  // apply on first paint and whenever prefs change
  useEffect(() => {
    applyPrefs(prefs);
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  // when the user logs in, pull their stored preferences from the API
  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get('/api/preferences')
      .then(({ data }) => {
        if (active && data) setPrefs((p) => ({ ...p, ...data }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const update = useCallback(
    (patch) => {
      setPrefs((p) => ({ ...p, ...patch }));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.put('/api/preferences', patch).catch(() => {});
      }, 400);
    },
    []
  );

  return (
    <ThemeContext.Provider
      value={{
        theme: prefs.theme,
        accent: prefs.accent_color,
        currency: prefs.currency,
        setTheme: (theme) => update({ theme }),
        setAccent: (accent_color) => update({ accent_color }),
        setCurrency: (currency) => update({ currency }),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
