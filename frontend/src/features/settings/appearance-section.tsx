import { useMemo } from 'react';
import { Check, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { Panel } from '@/components/shared/section';
import type { Density, FontChoice, Preferences, Radius, ThemeMode } from '@/data/types';
import type { Dictionary } from '@/i18n';
import {
  ACCENT_PRESETS, DARK_TONES, DEFAULT_PREFERENCES, LIGHT_TONES, type ToneOption,
} from '@/features/preferences/defaults';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { cn } from '@/lib/utils';
import { OptionCards, SettingRow, type OptionCard } from './option-cards';

type AppearanceText = Dictionary['settings'];

const RADIUS_PX: Record<Radius, string> = { none: '2px', sm: '6px', md: '12px', lg: '18px' };
const RADII: Radius[] = ['none', 'sm', 'md', 'lg'];

const FONT_FAMILIES: Record<FontChoice, string> = {
  geist: "'Geist Variable', sans-serif",
  inter: "'Inter Variable', sans-serif",
  system: 'system-ui, sans-serif',
  serif: "'Fraunces Variable', serif",
};

const APPEARANCE_KEYS = ['theme', 'light_tone', 'dark_tone', 'accent_color', 'density', 'radius', 'font'] as const;

/** Miniatura del tono: fondo, una tarjeta y dos líneas de texto. */
function ToneSwatch({ swatch }: { swatch: ToneOption<string>['swatch'] }) {
  return (
    <span className="flex h-12 w-full items-end rounded-sm border p-1.5" style={{ backgroundColor: swatch.canvas, borderColor: swatch.border }} aria-hidden>
      <span className="grid h-7 w-3/4 content-center gap-1 rounded-[3px] border px-1.5" style={{ backgroundColor: swatch.card, borderColor: swatch.border }}>
        <span className="h-1 w-3/4 rounded-full opacity-80" style={{ backgroundColor: swatch.text }} />
        <span className="h-1 w-1/2 rounded-full bg-primary" />
      </span>
    </span>
  );
}

function DensityPreview({ gap }: { gap: string }) {
  return (
    <span className={cn('grid w-10', gap)} aria-hidden>
      {[0, 1, 2].map((i) => <span key={i} className="h-1 rounded-full bg-foreground/50" />)}
    </span>
  );
}

function toneOptions<T extends string>(tones: ToneOption<T>[], t: AppearanceText): OptionCard<T>[] {
  return tones.map((tone) => {
    const text = t.tones[tone.value] ?? { label: tone.label, description: tone.description };
    return {
      value: tone.value,
      preview: <ToneSwatch swatch={tone.swatch} />,
      label: <span className="grid"><span>{text.label}</span><span className="text-xs text-muted-foreground">{text.description}</span></span>,
    };
  });
}

/** Opciones de cada ajuste con sus textos en el idioma activo. */
function buildOptions(t: AppearanceText) {
  const a = t.appearance;
  const theme: OptionCard<ThemeMode>[] = [
    { value: 'light', label: a.theme.light, preview: <Sun className="size-5" aria-hidden /> },
    { value: 'dark', label: a.theme.dark, preview: <Moon className="size-5" aria-hidden /> },
    { value: 'system', label: a.theme.system, preview: <Monitor className="size-5" aria-hidden /> },
  ];
  const density: OptionCard<Density>[] = [
    { value: 'comfortable', label: a.density.comfortable, preview: <DensityPreview gap="gap-1.5" /> },
    { value: 'compact', label: a.density.compact, preview: <DensityPreview gap="gap-0.5" /> },
  ];
  const radius: OptionCard<Radius>[] = RADII.map((value) => ({
    value,
    label: a.radius[value],
    preview: (
      <span
        className="block size-7 border-t-2 border-l-2 border-foreground/70"
        style={{ borderTopLeftRadius: RADIUS_PX[value] }}
        aria-hidden
      />
    ),
  }));
  const fonts: OptionCard<FontChoice>[] = (
    [['geist', 'Geist'], ['inter', 'Inter'], ['system', a.font.system], ['serif', 'Serif']] as const
  ).map(([value, label]) => ({
    value,
    label: <span style={{ fontFamily: FONT_FAMILIES[value] }}>{label}</span>,
    preview: <span className="text-2xl leading-none" style={{ fontFamily: FONT_FAMILIES[value] }} aria-hidden>Aa 12</span>,
  }));
  return {
    theme,
    density,
    radius,
    fonts,
    lightTones: toneOptions(LIGHT_TONES, t),
    darkTones: toneOptions(DARK_TONES, t),
  };
}

export function AppearanceSection() {
  const { preferences, update, isDark, t: dictionary } = usePreferences();
  const t = dictionary.settings;
  const a = t.appearance;
  const options = useMemo(() => buildOptions(t), [t]);

  function resetAppearance() {
    const defaults: Partial<Preferences> = {};
    for (const key of APPEARANCE_KEYS) Object.assign(defaults, { [key]: DEFAULT_PREFERENCES[key] });
    update(defaults);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <Panel
        title={a.title}
        description={a.description}
        actions={<Button variant="ghost" size="sm" onClick={resetAppearance}><RotateCcw /> {a.reset}</Button>}
      >
        <div className="divide-y">
          <SettingRow title={a.theme.title}>
            <OptionCards label={a.theme.title} value={preferences.theme} onChange={(theme) => update({ theme })} options={options.theme} className="grid-cols-3" />
          </SettingRow>
          <SettingRow title={a.background.title} description={a.background.description}>
            <div className="grid gap-4">
              <ToneGroup title={a.background.lightTheme} active={!isDark} inUse={a.background.inUse}>
                <OptionCards label={a.background.lightLabel} value={preferences.light_tone} onChange={(light_tone) => update({ light_tone })} options={options.lightTones} />
              </ToneGroup>
              <ToneGroup title={a.background.darkTheme} active={isDark} inUse={a.background.inUse}>
                <OptionCards label={a.background.darkLabel} value={preferences.dark_tone} onChange={(dark_tone) => update({ dark_tone })} options={options.darkTones} />
              </ToneGroup>
            </div>
          </SettingRow>
          <SettingRow title={a.accent.title} description={a.accent.description}>
            <AccentPicker value={preferences.accent_color} onChange={(accent_color) => update({ accent_color })} t={t} />
          </SettingRow>
          <SettingRow title={a.density.title} description={a.density.description}>
            <OptionCards label={a.density.title} value={preferences.density} onChange={(density) => update({ density })} options={options.density} className="sm:grid-cols-2" />
          </SettingRow>
          <SettingRow title={a.radius.title}>
            <OptionCards label={a.radius.title} value={preferences.radius} onChange={(radius) => update({ radius })} options={options.radius} />
          </SettingRow>
          <SettingRow title={a.font.title}>
            <OptionCards label={a.font.title} value={preferences.font} onChange={(font) => update({ font })} options={options.fonts} />
          </SettingRow>
        </div>
      </Panel>
      <LivePreview t={t} />
    </div>
  );
}

function ToneGroup({ title, active, inUse, children }: { title: string; active: boolean; inUse: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-2 text-sm">
        {title}
        {active && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">{inUse}</span>}
      </p>
      {children}
    </div>
  );
}

function AccentPicker({ value, onChange, t }: { value: string; onChange(color: string): void; t: AppearanceText }) {
  const current = value.toLowerCase();
  const isCustom = !ACCENT_PRESETS.some((p) => p.value === current);
  return (
    <div role="radiogroup" aria-label={t.appearance.accent.title} className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
      {ACCENT_PRESETS.map((preset) => {
        const selected = preset.value === current;
        return (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(preset.value)}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected && 'border-primary bg-accent',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: preset.value }}>
              {selected && <Check className="size-3.5 text-white" aria-hidden />}
            </span>
            <span className="truncate">{t.accents[preset.value] ?? preset.label}</span>
          </button>
        );
      })}
      <label
        className={cn(
          'relative flex min-w-0 cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring',
          isCustom && 'border-primary bg-accent',
        )}
      >
        <span className="size-6 shrink-0 rounded-full border border-dashed" style={isCustom ? { backgroundColor: current, borderStyle: 'solid' } : undefined} />
        <span className="truncate">{t.appearance.accent.custom}</span>
        <input
          type="color"
          value={current}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={t.appearance.accent.customLabel}
        />
      </label>
    </div>
  );
}

/** Muestra del efecto de la apariencia sobre piezas reales de la app. */
function LivePreview({ t }: { t: AppearanceText }) {
  const p = t.appearance.preview;
  return (
    <aside aria-label={p.label} className="grid gap-3 rounded-lg border bg-card p-4 lg:sticky lg:top-20">
      <p className="text-sm text-muted-foreground">{p.label}</p>
      <div>
        <p className="text-sm text-muted-foreground">{p.free}</p>
        <Money value={312.4} className="text-2xl font-semibold" />
      </div>
      <Progress value={64} className="h-1.5" aria-label={p.progress} />
      <div className="flex items-center gap-3 rounded-md border p-2.5">
        <IconBadge icon="cart" color="#10b981" badgeSize="sm" />
        <span className="min-w-0 flex-1 truncate text-sm">{p.sampleCategory}</span>
        <Money value={-54.2} signed tone="auto" className="text-sm font-medium" />
      </div>
      <Button className="w-full" tabIndex={-1}>{p.button}</Button>
    </aside>
  );
}
