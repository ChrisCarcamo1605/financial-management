import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { ChartLegend, ChartTooltipCard } from './chart-tooltip';

export interface CashFlowDatum {
  /** Fecha ISO de referencia del periodo. */
  date: string;
  income: number;
  expense: number;
}

const SERIES = [
  { key: 'income', color: 'var(--viz-inflow)' },
  { key: 'expense', color: 'var(--viz-outflow)' },
] as const;

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

/**
 * Entradas vs salidas por mes: barras agrupadas en un solo eje.
 * Incluye leyenda, tooltip por columna y una tabla accesible oculta.
 */
export function CashFlowChart({ data, height = 260 }: { data: CashFlowDatum[]; height?: number }) {
  const fmt = useFormat();
  const t = useT().common;
  const rows = data.map((d) => ({ ...d, label: fmt.monthShort(d.date) }));
  const series = SERIES.map((s) => ({ ...s, label: t.money[s.key] }));

  return (
    <figure className="grid gap-3">
      <ChartLegend items={series.map(({ label, color }) => ({ label, color }))} />
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} tickMargin={8} />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              tickFormatter={(value: number) => fmt.money(value, { compact: true })}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
              content={({ active, payload }) => {
                const datum = payload?.[0]?.payload as (CashFlowDatum & { label: string }) | undefined;
                if (!active || !datum) return null;
                return (
                  <ChartTooltipCard
                    title={fmt.monthYear(datum.date)}
                    rows={[
                      ...series.map((s) => ({ label: s.label, color: s.color, value: fmt.money(datum[s.key]) })),
                      { label: t.money.net, value: fmt.money(datum.income - datum.expense, { signed: true }) },
                    ]}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t.charts.cashFlowCaption}</caption>
        <thead><tr><th>{t.charts.month}</th><th>{t.money.income}</th><th>{t.money.expense}</th></tr></thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.date}><td>{fmt.monthYear(d.date)}</td><td>{fmt.money(d.income)}</td><td>{fmt.money(d.expense)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
