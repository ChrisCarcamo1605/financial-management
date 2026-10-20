import { Field, SelectInput } from '@/components/shared/form';
import { Panel } from '@/components/shared/section';
import type { DateFormatChoice, LanguageChoice, LocaleChoice } from '@/data/types';
import { LANGUAGES } from '@/i18n';
import { currencyOptions } from '@/features/preferences/defaults';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { createFormatters } from '@/lib/format';

const LOCALES: LocaleChoice[] = ['es-SV', 'es-MX', 'es-ES', 'en-US'];
const DATE_FORMATS: DateFormatChoice[] = ['d MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];

const SAMPLE_AMOUNT = 1234.5;

export function RegionalSection() {
  const { preferences, update, fmt, t: dictionary } = usePreferences();
  const t = dictionary.settings;
  const today = new Date();
  // Cada opción se muestra con el ejemplo que produciría.
  const sample = (patch: Partial<typeof preferences>) => createFormatters({
    language: preferences.language,
    locale: patch.locale ?? preferences.locale,
    currency: patch.currency ?? preferences.currency,
    dateFormat: patch.date_format ?? preferences.date_format,
  });

  return (
    <Panel title={t.regional.title} description={t.regional.description}>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t.regional.language} hint={t.regional.languageHint}>
          {(id) => (
            <SelectInput
              id={id}
              value={preferences.language}
              onChange={(language: LanguageChoice) => update({ language })}
              options={LANGUAGES.map((l) => ({ value: l.value, label: <span lang={l.value}>{l.label}</span> }))}
            />
          )}
        </Field>
        <Field label={t.regional.currency} hint={t.regional.example(fmt.money(SAMPLE_AMOUNT))}>
          {(id) => (
            <SelectInput
              id={id}
              value={preferences.currency}
              onChange={(currency) => update({ currency })}
              options={currencyOptions(dictionary)}
            />
          )}
        </Field>
        <Field label={t.regional.numberFormat} hint={t.regional.example(`${fmt.money(SAMPLE_AMOUNT)}, ${fmt.date(today)}`)}>
          {(id) => (
            <SelectInput
              id={id}
              value={preferences.locale}
              onChange={(locale: LocaleChoice) => update({ locale })}
              options={LOCALES.map((locale) => ({
                value: locale,
                label: <span className="flex w-full justify-between gap-3">{t.regional.locales[locale]}<span className="text-muted-foreground tabular">{sample({ locale }).money(SAMPLE_AMOUNT)}</span></span>,
              }))}
            />
          )}
        </Field>
        <Field label={t.regional.dateFormat} hint={t.regional.today(fmt.date(today))}>
          {(id) => (
            <SelectInput
              id={id}
              value={preferences.date_format}
              onChange={(date_format: DateFormatChoice) => update({ date_format })}
              options={DATE_FORMATS.map((format) => ({ value: format, label: sample({ date_format: format }).date(today) }))}
            />
          )}
        </Field>
      </div>
    </Panel>
  );
}
