import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { ChartLegend, ChartTooltipCard } from './chart-tooltip';
import type { CashFlowDatum } from './cash-flow-chart';

interface TrendDatum extends CashFlowDatum {
  net: number;
}

/**
 * Orden y colores fijos (validados para daltonismo). En oscuro el par
 * neto/entradas cae en la banda 6-8, por eso cada línea lleva además su forma
 * de marcador y una etiqueta directa al final.
 */
const SERIES = [
  { key: 'income', color: 'var(--viz-inflow)', shape: 'circle' },
  { key: 'expense', color: 'var(--viz-outflow)', shape: 'square' },
  { key: 'net', color: 'var(--viz-card)', shape: 'diamond' },
] as const;

type Shape = (typeof SERIES)[number]['shape'];

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
const LABEL_GAP = 15;

function Marker({ cx, cy, color, shape }: { cx?: number; cy?: number; color: string; shape: Shape }) {
  if (cx == null || cy == null) return null;
  const ring = { stroke: 'var(--card)', strokeWidth: 2, fill: color };
  if (shape === 'square') return <rect x={cx - 4} y={cy - 4} width={8} height={8} rx={1.5} {...ring} />;
  if (shape === 'diamond') return <path d={`M${cx} ${cy - 5.5}L${cx + 5.5} ${cy}L${cx} ${cy + 5.5}L${cx - 5.5} ${cy}Z`} {...ring} />;
  return <circle cx={cx} cy={cy} r={4.5} {...ring} />;
}

/** Tendencia mensual de entradas, salidas y neto en un solo eje. */
export function TrendLineChart({ data, height = 280 }: { data: TrendDatum[]; height?: number }) {
  const fmt = useFormat();
  const t = useT().common;
  const rows = data.map((d) => ({ ...d, label: fmt.monthShort(d.date) }));
  const series = SERIES.map((s) => ({ ...s, label: t.money[s.key] }));
  const last = rows.length - 1;
  // Posición original del último punto de cada serie. Las etiquetas se recolocan
  // siempre desde estas posiciones, así que repetir el dibujo da el mismo resultado.
  const rawLabelY = new Map<string, number>();
  const placeLabel = (key: string, y: number) => {
    rawLabelY.set(key, y);
    const placed: number[] = [];
    let result = y;
    for (const series of SERIES) {
      const raw = rawLabelY.get(series.key);
      if (raw === undefined) continue;
      let next = raw;
      for (const taken of [...placed].sort((a, b) => a - b)) {
        if (Math.abs(next - taken) < LABEL_GAP) next = taken + LABEL_GAP;
      }
      placed.push(next);
      if (series.key === key) result = next;
    }
    return result;
  };

  return (
    <figure className="grid gap-3">
      <ChartLegend items={series.map(({ label, color }) => ({ label, color }))} />
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 72, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} tickMargin={8} />
            <YAxis width={56} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={(v: number) => fmt.money(v, { compact: true })} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const datum = payload?.[0]?.payload as (TrendDatum & { label: string }) | undefined;
                if (!active || !datum) return null;
                return (
                  <ChartTooltipCard
                    title={fmt.monthYear(datum.date)}
                    rows={series.map((s) => ({ label: s.label, color: s.color, value: fmt.money(datum[s.key], { signed: s.key === 'net' }) }))}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props) => <Marker key={`${s.key}-${props.index}`} cx={props.cx} cy={props.cy} color={s.color} shape={s.shape} />}
                activeDot={(props) => <Marker cx={props.cx} cy={props.cy} color={s.color} shape={s.shape} />}
                label={(props) => {
                  // Etiqueta directa solo en el último punto, en tinta (no en el color de la serie).
                  if (props.index !== last || props.x == null || props.y == null) return <g key={`${s.key}-l${props.index}`} />;
                  return (
                    <text key={`${s.key}-label`} x={Number(props.x) + 10} y={placeLabel(s.key, Number(props.y))} dy={4} fontSize={12} fill="var(--foreground)">
                      {s.label}
                    </text>
                  );
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t.charts.trendCaption}</caption>
        <thead><tr><th>{t.charts.month}</th><th>{t.money.income}</th><th>{t.money.expense}</th><th>{t.money.net}</th></tr></thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.date}><td>{fmt.monthYear(d.date)}</td><td>{fmt.money(d.income)}</td><td>{fmt.money(d.expense)}</td><td>{fmt.money(d.net)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
