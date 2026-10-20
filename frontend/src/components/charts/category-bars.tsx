import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import type { CategorySpending } from '@/data/types';
import { useFormat, useT } from '@/features/preferences/preferences-provider';

/**
 * Gasto por categoría como lista de barras horizontales. Una sola serie, un
 * solo color: la identidad de cada categoría la da su icono, no la barra.
 */
export function CategoryBars({ items, limit = 6 }: { items: CategorySpending[]; limit?: number }) {
  const fmt = useFormat();
  const t = useT();
  const visible = items.slice(0, limit);
  const rest = items.slice(limit);
  const restTotal = rest.reduce((sum, c) => sum + c.total_amount, 0);
  const max = Math.max(...visible.map((c) => c.total_amount), restTotal, 1);

  const rows = [
    ...visible.map((c) => ({ key: c.category_name, name: c.category_name, icon: c.icon, color: c.color, amount: c.total_amount, pct: c.percentage })),
    ...(rest.length ? [{ key: '__other', name: t.common.charts.other(rest.length), icon: 'default', color: null, amount: restTotal, pct: rest.reduce((s, c) => s + c.percentage, 0) }] : []),
  ];

  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5">
          <IconBadge icon={row.icon} color={row.color} badgeSize="sm" className="row-span-2" />
          <span className="truncate text-sm">{row.name}</span>
          <span className="text-right text-sm">
            <Money value={row.amount} className="font-medium" />
            <span className="ml-2 text-xs text-muted-foreground tabular">{fmt.percent(row.pct)}</span>
          </span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-viz-track">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(row.amount / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
