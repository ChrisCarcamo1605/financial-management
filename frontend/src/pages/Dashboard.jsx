import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import { Loading, ErrorState } from '../components/State';
import { AreaLineChart, CategoryBars } from '../components/charts/Charts';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import { money, signedMoney, fmtDateShort } from '../lib/format';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function normCashFlow(cf = []) {
  return cf.map((it, i) => {
    const income = Number(it.income ?? it.total_income ?? it.inflow ?? 0);
    const expense = Number(it.expense ?? it.total_expense ?? it.outflow ?? 0);
    const net = Number(it.net ?? income - expense);
    let label = it.period ?? it.month ?? it.label ?? it.date ?? `${i + 1}`;
    if (typeof label === 'string' && /\d{4}-\d{2}/.test(label)) {
      const m = parseInt(label.slice(5, 7), 10);
      label = MONTHS[m - 1] || label;
    }
    return { label: String(label), income, expense, net };
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currency } = useTheme();
  const summary = useFetch('/api/dashboard/summary');
  const flow = useFetch('/api/analytics/cash-flow', { params: { group_by: 'month' } });

  const cf = useMemo(() => {
    const raw = flow.data?.cash_flow || flow.data || [];
    return normCashFlow(Array.isArray(raw) ? raw : []);
  }, [flow.data]);

  if (summary.loading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="content"><Loading rows={6} /></div>
      </>
    );
  }
  if (summary.error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="content"><ErrorState error={summary.error} onRetry={summary.refetch} /></div>
      </>
    );
  }

  const d = summary.data || {};
  const budgets = d.budgets_status || [];
  const recent = d.recent_transactions || [];
  const netSeries = cf.map((c) => c.net);
  const labels = cf.map((c) => c.label);

  return (
    <>
      <PageHeader title="Dashboard">
        <button className="btn btn-primary" onClick={() => navigate('/transactions')}>
          <PlusIcon /> Nueva transacción
        </button>
      </PageHeader>

      <div className="content">
        <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="stat">
            <div className="stat-lbl">Balance total</div>
            <div className="stat-val pos num">{money(d.total_balance, currency)}</div>
            <div className="stat-delta">{(d.accounts || []).length} cuentas</div>
          </div>
          <div className="stat">
            <div className="stat-lbl">Ingresos del mes</div>
            <div className="stat-val num">{money(d.monthly_income, currency)}</div>
          </div>
          <div className="stat">
            <div className="stat-lbl">Gastos del mes</div>
            <div className="stat-val neg num">{money(d.monthly_expense, currency)}</div>
          </div>
          <div className="stat">
            <div className="stat-lbl">Neto del mes</div>
            <div className={`stat-val num ${Number(d.monthly_net) >= 0 ? 'pos' : 'neg'}`}>{money(d.monthly_net, currency)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, marginBottom: 14 }}>
          <div className="panel panel-pad">
            <div className="panel-head" style={{ padding: 0, border: 'none', marginBottom: 14 }}>
              <span className="panel-title">Flujo neto · {cf.length} meses</span>
            </div>
            {netSeries.length > 1 ? (
              <AreaLineChart points={netSeries} labels={labels} />
            ) : (
              <div className="empty" style={{ padding: 40 }}>Sin histórico suficiente todavía</div>
            )}
          </div>

          <div className="panel panel-pad">
            <div className="panel-head" style={{ padding: 0, border: 'none', marginBottom: 14 }}>
              <span className="panel-title">Presupuestos</span>
              <span className="panel-link" onClick={() => navigate('/budgets')}>Ver →</span>
            </div>
            {budgets.length === 0 ? (
              <div className="empty-sub" style={{ color: 'var(--t3)' }}>Aún no hay presupuestos</div>
            ) : (
              budgets.slice(0, 5).map((b) => {
                const p = Number(b.percentage ?? ((b.spent / b.amount) * 100 || 0));
                const cls = p >= 100 ? 'over' : p >= 85 ? 'warn' : '';
                return (
                  <div key={b.id} style={{ marginBottom: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5 }}>{b.category_name}</span>
                      <span className="mute num" style={{ fontSize: 11.5 }}>{money(b.spent, currency)} / {money(b.amount, currency)}</span>
                    </div>
                    <div className="bar-bg"><div className={`bar-fill ${cls}`} style={{ width: `${Math.min(100, p)}%` }} /></div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="tbl-wrap">
          <div className="panel-head">
            <span className="panel-title">Transacciones recientes</span>
            <span className="panel-link" onClick={() => navigate('/transactions')}>Ver todas →</span>
          </div>
          {recent.length === 0 ? (
            <div className="empty"><div className="empty-sub">Sin transacciones todavía</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 8).map((t) => (
                  <tr key={t.id}>
                    <td>{t.description || '—'}</td>
                    <td><span className="chip">{t.category_name}</span></td>
                    <td className="mute">{t.account_name}</td>
                    <td className="mute">{fmtDateShort(t.date)}</td>
                    <td className={`amt ${t.type === 'income' ? 'pos' : 'neg'}`}>{signedMoney(t.amount, t.type, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
