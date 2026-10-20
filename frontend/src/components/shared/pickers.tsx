import { Check } from 'lucide-react';
import { ICON_GROUPS } from '@/lib/icons';
import { CATEGORY_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';
import { CategoryIcon } from './category-icon';

interface ColorPickerProps {
  value: string;
  onChange(color: string): void;
  colors?: string[];
  label: string;
}

/** Muestras de color + selector libre. */
export function ColorPicker({ value, onChange, colors = CATEGORY_COLORS, label }: ColorPickerProps) {
  const t = useT();
  const custom = !colors.includes(value.toLowerCase());
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const selected = value.toLowerCase() === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className="flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[selected=true]:ring-2 data-[selected=true]:ring-foreground"
            data-selected={selected}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-4 text-white" aria-hidden />}
          </button>
        );
      })}
      <label
        className={cn(
          'relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed text-xs text-muted-foreground ring-offset-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring',
          custom && 'border-solid ring-2 ring-foreground',
        )}
        style={custom ? { backgroundColor: value } : undefined}
        title={t.common.form.customColor}
      >
        <span className={cn(custom && 'sr-only')}>+</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={t.common.form.customColor}
        />
      </label>
    </div>
  );
}

interface IconPickerProps {
  value: string;
  onChange(icon: string): void;
  color?: string;
}

export function IconPicker({ value, onChange, color }: IconPickerProps) {
  return (
    <div className="grid max-h-56 gap-3 overflow-y-auto rounded-md border p-3">
      {ICON_GROUPS.map((group) => (
        <div key={group.label} role="radiogroup" aria-label={group.label}>
          <p className="mb-1.5 text-xs text-muted-foreground">{group.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.icons.map((key) => {
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={key}
                  onClick={() => onChange(key)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    selected && 'border-transparent text-white',
                  )}
                  style={selected ? { backgroundColor: color || 'var(--accent-brand)' } : undefined}
                >
                  <CategoryIcon icon={key} size={17} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
