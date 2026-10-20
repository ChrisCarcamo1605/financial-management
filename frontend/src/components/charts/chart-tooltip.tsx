import type { ReactNode } from 'react';

export interface TooltipRow {
  label: string;
  value: ReactNode;
  /** Color de la serie; el texto se mantiene en tinta (nunca en el color de la serie). */
  color?: string;
}

/** Tooltip de gráfica con el estilo de la app. */
export function ChartTooltipCard({ title, rows }: { title: ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="min-w-40 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{title}</p>
      <dl className="grid gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && <span className="size-2.5 rounded-sm" style={{ backgroundColor: row.color }} aria-hidden />}
              {row.label}
            </dt>
            <dd className="tabular font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
