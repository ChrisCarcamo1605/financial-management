import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDataSource } from '@/data/provider';
import { queryKeys } from '@/data/query-keys';
import type { Preferences } from '@/data/types';
import { useMediaQuery } from '@/hooks/use-media-query';
import { createFormatters, type Formatters } from '@/lib/format';
import { DICTIONARIES, type Dictionary } from '@/i18n';
import { storage } from '@/lib/storage';
import { useAuth } from '@/features/auth/auth-provider';
import { applyAppearance, resolveDark } from './appearance';
import { DARK_TONES, DEFAULT_PREFERENCES, LIGHT_TONES } from './defaults';

const CACHE_KEY = 'caudal:preferences';
const SAVE_DELAY_MS = 500;

interface PreferencesContextValue {
  preferences: Preferences;
  update(patch: Partial<Preferences>): void;
  isDark: boolean;
  fmt: Formatters;
  /** Textos de la interfaz en el idioma elegido. */
  t: Dictionary;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const DATE_FORMATS: Preferences['date_format'][] = ['d MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
const LIGHT_TONE_VALUES = new Set<string>(LIGHT_TONES.map((t) => t.value));
const DARK_TONE_VALUES = new Set<string>(DARK_TONES.map((t) => t.value));

/** Completa con defaults y descarta valores heredados que la UI no entiende (p. ej. 'YYYY-MM-DD'). */
function normalize(raw: Partial<Preferences> | null | undefined): Preferences {
  const merged = { ...DEFAULT_PREFERENCES, ...raw };
  if (!DATE_FORMATS.includes(merged.date_format)) merged.date_format = DEFAULT_PREFERENCES.date_format;
  // Una API sin la migración 002 no envía tonos: se usan los de por defecto.
  if (!LIGHT_TONE_VALUES.has(merged.light_tone)) merged.light_tone = DEFAULT_PREFERENCES.light_tone;
  if (!DARK_TONE_VALUES.has(merged.dark_tone)) merged.dark_tone = DEFAULT_PREFERENCES.dark_tone;
  if (!(merged.language in DICTIONARIES)) merged.language = DEFAULT_PREFERENCES.language;
  return merged;
}

function initialPreferences(): Preferences {
  return normalize(storage.read<Partial<Preferences>>(CACHE_KEY));
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const source = useDataSource();
  const { status } = useAuth();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [preferences, setPreferences] = useState(initialPreferences);
  const pending = useRef<Partial<Preferences>>({});
  const timer = useRef<number | undefined>(undefined);

  const remote = useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => source.preferences.get(),
    enabled: status === 'authenticated',
    staleTime: Infinity,
  });

  // Lo guardado en la cuenta manda sobre la caché local, salvo cambios aún sin enviar.
  useEffect(() => {
    if (remote.data) setPreferences(normalize({ ...remote.data, ...pending.current }));
  }, [remote.data]);

  useLayoutEffect(() => {
    applyAppearance(preferences, systemDark);
    storage.write(CACHE_KEY, preferences);
  }, [preferences, systemDark]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
    if (status !== 'authenticated') return;
    // Se acumulan los cambios para no perder ninguno al agruparlos en un solo envío.
    pending.current = { ...pending.current, ...patch };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const body = pending.current;
      pending.current = {};
      source.preferences.update(body).catch(() => {
        /* se reintenta en el siguiente cambio; la caché local conserva el valor */
        pending.current = { ...body, ...pending.current };
      });
    }, SAVE_DELAY_MS);
  }, [source, status]);

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    update,
    isDark: resolveDark(preferences.theme, systemDark),
    t: DICTIONARIES[preferences.language],
    fmt: createFormatters({
      language: preferences.language,
      locale: preferences.locale,
      currency: preferences.currency,
      dateFormat: preferences.date_format,
    }),
  }), [preferences, update, systemDark]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider');
  return context;
}

/** Textos de la interfaz en el idioma del usuario. */
export function useT() {
  return usePreferences().t;
}

/** Atajo para los formateadores de moneda y fecha. */
export function useFormat() {
  return usePreferences().fmt;
}
