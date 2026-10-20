import { Money } from '@/components/shared/money';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import type { QuincenaBreakdown } from './quincena-math';

/** Segmentos en orden fijo (validado para daltonismo como paleta adyacente). */
const SEGMENTS = [
  { key: 'services', color: 'var(--viz-outflow)' },
  { key: 'cards', color: 'var(--viz-card)' },
  { key: 'loans', color: 'var(--viz-loan)' },
  { key: 'savings', color: 'var(--viz-saving)' },
] as const;

interface FlowBarProps {
  breakdown: QuincenaBreakdown;
  className?: string;
  /** Muestra la leyenda con montos debajo de la barra. */
  legend?: boolean;
}

/**
 * La barra de caudal: el ingreso de la quincena como un río que se reparte en
 * compromisos (segmentos de color) y lo que queda libre (la pista vacía).
 */
export function FlowBar({ breakdown, className, legend = true }: FlowBarProps) {
  const fmt = useFormat();
  const { quincenas: t, common } = useT();
  const scale = Math.max(breakdown.income, breakdown.committed, 1);
  const segments = SEGMENTS.map((s) => ({ ...s, label: t.flow[s.key], amount: breakdown[s.key] })).filter((s) => s.amount > 0);
  const overspent = breakdown.free < 0;

  return (
    <figure className={cn('grid gap-3', className)}>
      <div
        className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-viz-track"
        role="img"
        aria-label={t.flow.aria(fmt.money(breakdown.income), fmt.money(breakdown.committed), fmt.money(breakdown.free))}
      >
        {segments.map((s) => (
          <span key={s.key} className="h-full first:rounded-l-full" style={{ width: `${(s.amount / scale) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      {legend && (
        <figcaption>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:flex sm:flex-wrap">
            {segments.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
                <span className="text-muted-foreground">{s.label}</span>
                <Money value={s.amount} className="ml-auto font-medium sm:ml-0" />
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm border border-foreground/30 bg-viz-track" aria-hidden />
              <span className="text-muted-foreground">{overspent ? common.money.shortfall : common.money.free}</span>
              <Money value={breakdown.free} tone={overspent ? 'outflow' : 'neutral'} className="ml-auto font-medium sm:ml-0" />
            </li>
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
