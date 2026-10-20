import type { Preferences } from '@/data/types';

const HEX = /^#[0-9a-f]{6}$/i;

/** Luminancia relativa WCAG de un color hex. */
export function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto blanco o tinta sobre el acento, el que tenga mejor contraste. */
export function readableOn(hex: string) {
  const l = luminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastInk = (l + 0.05) / (luminance('#14212b') + 0.05);
  return contrastWhite >= contrastInk ? '#ffffff' : '#14212b';
}

export function resolveDark(theme: Preferences['theme'], systemDark: boolean) {
  return theme === 'dark' || (theme === 'system' && systemDark);
}

/** Aplica la apariencia al <html>: clase dark, atributos data-* y variables del acento. */
export function applyAppearance(prefs: Preferences, systemDark: boolean) {
  const root = document.documentElement;
  const accent = HEX.test(prefs.accent_color) ? prefs.accent_color : '#0e7c86';
  const dark = resolveDark(prefs.theme, systemDark);

  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.lightTone = prefs.light_tone;
  root.dataset.darkTone = prefs.dark_tone;
  root.dataset.density = prefs.density;
  root.dataset.radius = prefs.radius;
  root.dataset.font = prefs.font;
  root.style.setProperty('--accent-brand', accent);
  root.style.setProperty('--accent-brand-fg', readableOn(accent));
  root.lang = prefs.language;
  // La barra del navegador móvil toma el color del fondo activo.
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--canvas').trim() || accent);
}
