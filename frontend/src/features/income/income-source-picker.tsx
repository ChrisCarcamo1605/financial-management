import { Check } from 'lucide-react';
import { Money } from '@/components/shared/money';
import type { IncomeSource } from '@/data/types';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';

interface IncomeSourcePickerProps {
  sources: IncomeSource[];
  value: number | null;
  onSelect(source: IncomeSource): void;
}

/** Elegir la fuente de un cobro: rellena monto neto, cuenta y categoría. */
export function IncomeSourcePicker({ sources, value, onSelect }: IncomeSourcePickerProps) {
  const t = useT().income;
  return (
    <div role="radiogroup" aria-label={t.picker.label} className="grid gap-2 sm:grid-cols-2">
      {sources.map((source) => {
        const selected = source.id === value;
        return (
          <button
            key={source.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(source)}
            className={cn(
              'relative flex min-w-0 flex-col items-start gap-0.5 rounded-md border p-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected && 'border-primary bg-accent',
            )}
          >
            <span className="w-full truncate pr-5 text-sm font-medium">{source.name}</span>
            <span className="text-xs text-muted-foreground">
              <Money value={source.net_per_payment} className="font-medium text-foreground" /> {t.perPayment[source.pay_schedule]}
            </span>
            {selected && <Check className="absolute top-2.5 right-2.5 size-4 text-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
