import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { DateFormatChoice, ISODate, LanguageChoice, LocaleChoice } from '@/data/types';
import { parseDate } from './dates';

export interface FormatOptions {
  /** Idioma de nombres de meses y días. */
  language: LanguageChoice;
  /** Separadores numéricos y símbolo de moneda. */
  locale: LocaleChoice;
  currency: string;
  dateFormat: DateFormatChoice;
}

export interface MoneyOptions {
  /** Antepone + o − explícito. */
  signed?: boolean;
  /** Sin centavos (para ejes y totales grandes). */
  whole?: boolean;
  /** Notación compacta: $1.2 k. */
  compact?: boolean;
}

/** Formateadores ligados a las preferencias regionales del usuario. */
export function createFormatters({ language, locale, currency, dateFormat }: FormatOptions) {
  const dateLocale = language === 'es' ? es : enUS;
  const cache = new Map<string, Intl.NumberFormat>();

  function numberFormat(key: string, options: Intl.NumberFormatOptions) {
    let nf = cache.get(key);
    if (!nf) {
      nf = new Intl.NumberFormat(locale, options);
      cache.set(key, nf);
    }
    return nf;
  }

  function money(amount: number | null | undefined, options: MoneyOptions = {}) {
    const value = Number(amount ?? 0);
    const digits = options.whole || options.compact ? 0 : 2;
    const nf = numberFormat(`money-${digits}-${options.compact ? 'c' : 'n'}`, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: options.compact ? 1 : digits,
      notation: options.compact ? 'compact' : 'standard',
    });
    const text = nf.format(options.signed ? Math.abs(value) : value);
    if (!options.signed || value === 0) return text;
    return `${value > 0 ? '+' : '−'}${text}`;
  }

  function percent(value: number, digits = 0) {
    return numberFormat(`pct-${digits}`, { style: 'percent', maximumFractionDigits: digits }).format(value / 100);
  }

  function date(value: ISODate | Date | null | undefined, pattern: string = dateFormat) {
    if (!value) return '';
    try {
      return format(parseDate(value), pattern, { locale: dateLocale });
    } catch {
      return String(value);
    }
  }

  return {
    money,
    percent,
    date,
    /** '19 oct' — para listas densas. */
    dayMonth: (value: ISODate | Date) => date(value, 'd MMM'),
    /** 'octubre 2026'. */
    monthYear: (value: ISODate | Date) => date(value, 'LLLL yyyy'),
    /** 'oct'. */
    monthShort: (value: ISODate | Date) => date(value, 'LLL'),
    weekday: (value: ISODate | Date) => date(value, 'EEEE d'),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
