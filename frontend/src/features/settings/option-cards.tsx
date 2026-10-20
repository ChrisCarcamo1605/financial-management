import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OptionCard<T extends string> {
  value: T;
  label: ReactNode;
  /** Muestra visual sobre la etiqueta (p. ej. una esquina o un tipo de letra). */
  preview?: ReactNode;
}

interface OptionCardsProps<T extends string> {
  label: string;
  value: T;
  onChange(value: T): void;
  options: OptionCard<T>[];
  className?: string;
}

/** Grupo de opciones como tarjetas seleccionables (radio). */
export function OptionCards<T extends string>({ label, value, onChange, options, className }: OptionCardsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex min-w-0 flex-col items-start gap-2 rounded-md border bg-card p-3 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected && 'border-primary bg-accent',
            )}
          >
            {option.preview}
            <span className="max-w-full text-pretty break-words">{option.label}</span>
            {selected && <Check className="absolute top-2 right-2 size-4 text-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/** Fila de ajuste: título y explicación a la izquierda, control debajo. */
export function SettingRow({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-3 py-5 first:pt-0 last:pb-0">
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
