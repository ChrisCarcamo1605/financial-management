import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import { Loading, ErrorState } from '../components/State';
import { AreaLineChart } from '../components/charts/Charts';
import Icon from '../components/Icon';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import { money, signedMoney, fmtDateShort, isoDate } from '../lib/format';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function normCashFlow(cf = []) {
  return cf.map((it, i) => {
    const income = Number(it.income ?? it.total_income ?? it.inflow ?? 0);
    const expense = Number(it.expense ?? it.total_expense ?? it.outflow ?? 0);
    const net = Number(it.net ?? income - expense);
    let label = it.period ?? it.month ?? it.label ?? it.date ?? `${i + 1}`;
    if (typeof label === 'string' && /\d{4}-\d{2}/.test(label)) label = MONTHS[parseInt(label.slice(5, 7), 10) - 1] || label;
    return { label: String(label), income, expense, net };
  });
}

function dashboardRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  return { start_date: isoDate(start), end_date: isoDate(end) };
}

function TrendIcon({ up = true }) {
  return <span className={`dash-trend-icon ${up ? 'up' : 'down'}`}>{up ? '↗' : '↘'}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currency } = useTheme();
  const summary = useFetch('/api/dashboard/summary');
  const flow = useFetch('/api/analytics/cash-flow', { params: { ...dashboardRange(), group_by: 'month' } });
  const cf = useMemo(() => normCashFlow(flow.data?.cash_flow || flow.data || []), [flow.data]);

  if (summary.loading) return <><PageHeader title="Dashboard" /><div className="content"><Loading rows={6} /></div></>;
  if (summary.error) return <><PageHeader title="Dashboard" /><div className="content"><ErrorState error={summary.error} onRetry={summary.refetch} /></div></>;

  const d = summary.data || {};
  const budgets = d.budgets_status || [];
  const recent = d.recent_transactions || [];
  const budgetAmount = budgets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const budgetSpent = budgets.reduce((sum, b) => sum + Number(b.spent || 0), 0);
  const budgetPct = budgetAmount ? Math.round((budgetSpent / budgetAmount) * 100) : 0;
  const expenseRatio = Number(d.monthly_income) ? Math.round((Number(d.monthly_expense) / Number(d.monthly_income)) * 100) : 0;
  const dateLabel = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <>
      <PageHeader title="Dashboard">
        <button className="btn btn-primary dash-add" onClick={() => navigate('/transactions', { state: { openNew: true } })}><PlusIcon /> Nueva transacción</button>
      </PageHeader>
      <div className="content dashboard-v2">
        <section className="dash-hero">
          <div className="dash-hero-copy">
            <span className="dash-kicker">Panorama · {dateLabel}</span>
            <p className="dash-hero-label">Patrimonio disponible</p>
            <h1 className="num">{money(d.total_balance, currency)}</h1>
            <div className="dash-account-note"><span className="live-dot" /> Distribuido en {(d.accounts || []).length} cuentas activas</div>
          </div>
          <div className="dash-hero-orbit" aria-hidden="true"><div className="orbit-ring"><span>{Math.max(0, 100 - expenseRatio)}%</span><small>libre</small></div></div>
        </section>

        <section className="dash-metrics">
          <article className="dash-metric"><div><span>Ingresos</span><TrendIcon /></div><strong className="num">{money(d.monthly_income, currency)}</strong><small>Entradas de este mes</small></article>
          <article className="dash-metric"><div><span>Gastos</span><TrendIcon up={false} /></div><strong className="num">{money(d.monthly_expense, currency)}</strong><small>{expenseRatio}% de tus ingresos</small></article>
          <article className="dash-metric dash-metric-net"><div><span>Resultado neto</span><TrendIcon up={Number(d.monthly_net) >= 0} /></div><strong className={`num ${Number(d.monthly_net) >= 0 ? 'pos' : 'neg'}`}>{money(d.monthly_net, currency)}</strong><small>{Number(d.monthly_net) >= 0 ? 'Vas por buen camino' : 'Revisa tus gastos'}</small></article>
        </section>

        <section className="dash-grid">
          <article className="dash-card dash-flow">
            <div className="dash-card-head"><div><span className="dash-eyebrow">Evolución</span><h2>Flujo de caja</h2></div><span className="dash-period">Últimos 12 meses</span></div>
            {cf.length > 1 ? <AreaLineChart points={cf.map((c) => c.net)} labels={cf.map((c) => c.label)} height={220} /> : <div className="dash-empty">Aún no hay histórico suficiente</div>}
          </article>
          <article className="dash-card dash-budget-card">
            <div className="dash-card-head"><div><span className="dash-eyebrow">Control</span><h2>Presupuestos</h2></div><button className="dash-arrow" onClick={() => navigate('/budgets')} aria-label="Ver presupuestos">→</button></div>
            <div className="dash-budget-summary"><div className="dash-budget-ring" style={{ '--pct': `${Math.min(100, budgetPct)}%` }}><span>{budgetPct}%</span></div><div><strong className="num">{money(budgetSpent, currency)}</strong><span>de {money(budgetAmount, currency)} utilizados</span></div></div>
            <div className="dash-budget-list">{budgets.length === 0 ? <div className="dash-empty">Crea tu primer presupuesto</div> : budgets.slice(0, 4).map((b) => {
              const p = Number(b.percentage || 0);
              return <div className="dash-budget-row" key={b.id}><span className="dash-cat-icon" style={{ color: b.category_color, background: `color-mix(in srgb, ${b.category_color || 'var(--accent)'} 14%, transparent)` }}><Icon icon={b.category_icon} iconType={b.category_icon_type} size={13} /></span><span>{b.category_name}</span><b className={p >= 100 ? 'neg' : ''}>{Math.round(p)}%</b></div>;
            })}</div>
          </article>
        </section>

        <section className="dash-card dash-activity">
          <div className="dash-card-head"><div><span className="dash-eyebrow">Actividad</span><h2>Movimientos recientes</h2></div><button className="dash-text-link" onClick={() => navigate('/transactions')}>Ver todas <span>→</span></button></div>
          {recent.length === 0 ? <div className="dash-empty">Sin transacciones todavía</div> : <div className="dash-tx-list">{recent.slice(0, 6).map((t) => <button className="dash-tx" key={t.id} onClick={() => navigate('/transactions')}><span className="dash-tx-icon" style={{ color: t.category_color, background: `color-mix(in srgb, ${t.category_color || 'var(--accent)'} 14%, transparent)` }}><Icon icon={t.category_icon} iconType={t.category_icon_type} size={15} /></span><span className="dash-tx-main"><b>{t.description || t.category_name || 'Movimiento'}</b><small>{t.category_name} · {t.account_name}</small></span><span className="dash-tx-date">{fmtDateShort(t.date)}</span><strong className={`num ${t.type === 'income' ? 'pos' : 'neg'}`}>{signedMoney(t.amount, t.type, currency)}</strong></button>)}</div>}
        </section>
      </div>
    </>
  );
}
