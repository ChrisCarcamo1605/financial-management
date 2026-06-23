import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Loading } from '../components/State';
import { MultiLineChart, GroupedBars, CategoryBars, Legend } from '../components/charts/Charts';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import { money, isoDate } from '../lib/format';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const PALETTE = ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#f87171', '#3b82f6'];

function rangeFor(months) {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  return { start_date: isoDate(start), end_date: isoDate(end) };
}
function labelMonth(s, i) {
  if (typeof s === 'string' && /\d{4}-\d{2}/.test(s)) return MONTHS[parseInt(s.slice(5, 7), 10) - 1] || s;
  return s != null ? String(s) : `${i + 1}`;
}

export default function Analytics() {
  const { currency } = useTheme();
  const [months, setMonths] = useState(6);
  const range = rangeFor(months);

  const flow = useFetch('/api/analytics/cash-flow', { params: { ...range, group_by: 'month' } });
  const byCat = useFetch('/api/analytics/spending-by-category', { params: range });

  const cf = useMemo(() => {
    const raw = flow.data?.cash_flow || flow.data || [];
    return (Array.isArray(raw) ? raw : []).map((it, i) => ({
      label: labelMonth(it.period ?? it.month ?? it.date, i),
      income: Number(it.income ?? it.total_income ?? 0),
      expense: Number(it.expense ?? it.total_expense ?? 0),
      net: Number(it.net ?? (it.income ?? it.total_income ?? 0) - (it.expense ?? it.total_expense ?? 0)),
    }));
  }, [flow.data]);

  const cats = useMemo(() => {
    const raw = byCat.data?.categories || byCat.data || [];
    return (Array.isArray(raw) ? raw : []).map((c, i) => {
      const value = Number(c.total ?? c.amount ?? c.spent ?? 0);
      return { name: c.category_name || c.name || `Categoría ${i + 1}`, value, label: money(value, currency), color: c.color || PALETTE[i % PALETTE.length] };
    }).sort((a, b) => b.value - a.value);
  }, [byCat.data, currency]);

  const loading = flow.loading || byCat.loading;

  return (
    <>
      <PageHeader title="Analytics">
        <div className="seg">
          {[3, 6, 12].map((m) => <button key={m} className={months === m ? 'on' : ''} onClick={() => setMonths(m)}>{m === 12 ? '1A' : `${m}M`}</button>)}
        </div>
      </PageHeader>
      <div className="content">
        {loading ? <Loading rows={6} /> : (
          <>
            <div className="panel panel-pad" style={{ marginBottom: 12 }}>
              <div className="panel-head" style={{ padding: 0, border: 'none', marginBottom: 16 }}>
                <span className="panel-title">Ingresos · Gastos · Neto</span>
                <Legend items={[{ color: '#10b981', label: 'Ingresos' }, { color: '#f87171', label: 'Gastos' }, { color: '#8b5cf6', label: 'Neto' }]} />
              </div>
              {cf.length > 1 ? (
                <MultiLineChart
                  labels={cf.map((c) => c.label)}
                  series={[
                    { color: '#10b981', points: cf.map((c) => c.income) },
                    { color: '#f87171', points: cf.map((c) => c.expense) },
                    { color: '#8b5cf6', points: cf.map((c) => c.net) },
                  ]}
                />
              ) : <div className="empty" style={{ padding: 40 }}>Sin histórico suficiente</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="panel panel-pad">
                <div className="panel-head" style={{ padding: 0, border: 'none', marginBottom: 16 }}>
                  <span className="panel-title">Gasto por categoría</span>
                  <span className="mute" style={{ fontSize: 11.5 }}>{money(cats.reduce((a, c) => a + c.value, 0), currency)}</span>
                </div>
                {cats.length ? <CategoryBars items={cats.slice(0, 8)} /> : <div className="empty-sub" style={{ color: 'var(--t3)' }}>Sin gastos en el periodo</div>}
              </div>

              <div className="panel panel-pad">
                <div className="panel-head" style={{ padding: 0, border: 'none', marginBottom: 16 }}>
                  <span className="panel-title">Comparativa mensual</span>
                  <Legend items={[{ color: '#10b981', label: 'Ingreso' }, { color: '#f87171', label: 'Gasto' }]} />
                </div>
                {cf.length ? (
                  <GroupedBars groups={cf.map((c, i) => ({ label: c.label, current: i === cf.length - 1, bars: [{ value: c.income, color: '#10b981' }, { value: c.expense, color: '#f87171' }] }))} height={190} />
                ) : <div className="empty-sub" style={{ color: 'var(--t3)' }}>Sin datos</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
