import { Languages } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { LanguageChoice } from '@/data/types';
import { LANGUAGES } from '@/i18n';
import { cn } from '@/lib/utils';
import { usePreferences } from './preferences-provider';

/** Selector compacto de idioma (cada opción en su propio idioma). */
export function LanguageSwitch({ className }: { className?: string }) {
  const { preferences, update, t } = usePreferences();
  return (
    <Select value={preferences.language} onValueChange={(language) => update({ language: language as LanguageChoice })}>
      <SelectTrigger size="sm" className={cn('w-auto gap-2', className)} aria-label={t.shell.language.label}>
        <Languages className="size-4" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LANGUAGES.map((language) => (
          <SelectItem key={language.value} value={language.value} lang={language.value}>{language.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
