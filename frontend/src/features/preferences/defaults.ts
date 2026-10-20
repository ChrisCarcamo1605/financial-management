import type { DarkTone, LightTone, Preferences } from '@/data/types';
import { detectLanguage, type Dictionary } from '@/i18n';

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  light_tone: 'mineral',
  dark_tone: 'rio',
  accent_color: '#0e7c86',
  density: 'comfortable',
  radius: 'md',
  font: 'geist',
  language: detectLanguage(),
  currency: 'USD',
  locale: 'es-SV',
  date_format: 'd MMM yyyy',
  dashboard_layout: null,
};

/** Acentos sugeridos; el usuario también puede elegir cualquier color. */
export const ACCENT_PRESETS = [
  { value: '#0e7c86', label: 'Turquesa' },
  { value: '#2563eb', label: 'Lago' },
  { value: '#1f8a5b', label: 'Bosque' },
  { value: '#7c5cc4', label: 'Volcán' },
  { value: '#c2413a', label: 'Teja' },
  { value: '#b7791f', label: 'Café' },
  { value: '#db2777', label: 'Veranera' },
  { value: '#334155', label: 'Pizarra' },
];

export const CURRENCIES = [
  { value: 'USD', label: 'Dólar estadounidense' },
  { value: 'MXN', label: 'Peso mexicano' },
  { value: 'GTQ', label: 'Quetzal' },
  { value: 'HNL', label: 'Lempira' },
  { value: 'CRC', label: 'Colón costarricense' },
  { value: 'EUR', label: 'Euro' },
];

export interface ToneOption<T extends string> {
  value: T;
  label: string;
  description: string;
  /** Colores de la muestra: fondo, superficie y borde. */
  swatch: { canvas: string; card: string; border: string; text: string };
}

export const LIGHT_TONES: ToneOption<LightTone>[] = [
  { value: 'mineral', label: 'Mineral', description: 'Gris frío', swatch: { canvas: '#eef2f3', card: '#ffffff', border: '#d8e0e3', text: '#14212b' } },
  { value: 'nieve', label: 'Nieve', description: 'Casi blanco', swatch: { canvas: '#f8f9fb', card: '#ffffff', border: '#e3e6ea', text: '#14212b' } },
  { value: 'papel', label: 'Papel', description: 'Cálido', swatch: { canvas: '#f3f1ec', card: '#fdfcfa', border: '#ddd8ce', text: '#14212b' } },
  { value: 'salvia', label: 'Salvia', description: 'Verde suave', swatch: { canvas: '#edf1ec', card: '#fbfcfa', border: '#d3dccf', text: '#14212b' } },
];

export const DARK_TONES: ToneOption<DarkTone>[] = [
  { value: 'rio', label: 'Río', description: 'Azul petróleo', swatch: { canvas: '#0f1a20', card: '#15232b', border: '#253942', text: '#e6eef0' } },
  { value: 'grafito', label: 'Grafito', description: 'Gris neutro', swatch: { canvas: '#111214', card: '#18191c', border: '#2b2d31', text: '#ececee' } },
  { value: 'medianoche', label: 'Medianoche', description: 'Azul profundo', swatch: { canvas: '#0b1020', card: '#121a2e', border: '#24304d', text: '#e6eaf5' } },
  { value: 'carbon', label: 'Carbón', description: 'Negro puro', swatch: { canvas: '#000000', card: '#0c0c0d', border: '#222225', text: '#ededee' } },
];

/** Opciones de moneda con el nombre en el idioma de la interfaz. */
export function currencyOptions(t: Dictionary) {
  const names: Record<string, string> = t.settings.currencies;
  return CURRENCIES.map((c) => ({ value: c.value, label: `${c.value} · ${names[c.value] ?? c.label}` }));
}
