import { en } from './en';
import { es } from './es';
import type { Dictionary, Language } from './types';

export type { Dictionary, Language };

export const DICTIONARIES: Record<Language, Dictionary> = { es, en };

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

/** Idioma inicial antes de conocer las preferencias: el del navegador si es inglés. */
export function detectLanguage(): Language {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}
