import { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import { money, fmtDate } from '../lib/format';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function curMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const TYPE_META = {
  income: { color: 'var(--accent)', label: 'Ingreso', icon: '💰' },
  recurring_service: { color: 'var(--red)', label: 'Servicio', icon: '⚡' },
  loan_payment: { color: 'var(--amber)', label: 'Préstamo', icon: '🏦' },
  savings: { color: 'var(--violet)', label: 'Ahorro', icon: '🐖' },
};

function QuincenaCard({ q, currency, isCurrent }) {
  const income = q.income || [];
  const expenses = q.expenses || [];
  return (
    <div className="panel" style={isCurrent ? { borderColor: 'var(--accent-border)' } : undefined}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Q{q.quincena}</span>
            <span className="mute" style={{ fontSize: 11.5 }}>{fmtDate(q.start_date, 'd MMM')} — {fmtDate(q.end_date, 'd MMM')}</span>
          </div>
          <span className="chip" style={isCurrent ? { color: 'var(--accent)', background: 'var(--accent-bg)' } : undefined}>{isCurrent ? 'En curso' : 'Cerrada'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <div className="preview-box" style={{ padding: '8px 10px' }}><div className="stat-lbl" style={{ marginBottom: 3 }}>Ingreso</div><div className="num pos" style={{ fontWeight: 700, fontSize: 14 }}>{money(q.total_income_net, currency)}</div></div>
          <div className="preview-box" style={{ padding: '8px 10px' }}><div className="stat-lbl" style={{ marginBottom: 3 }}>Fijos</div><div className="num neg" style={{ fontWeight: 700, fontSize: 14 }}>{money(q.total_expenses, currency)}</div></div>
          <div className="preview-box" style={{ padding: '8px 10px' }}><div className="stat-lbl" style={{ marginBottom: 3 }}>Libre</div><div className="num" style={{ fontWeight: 700, fontSize: 14 }}>{money(q.net_available, currency)}</div></div>
        </div>
      </div>

      <div style={{ padding: 8 }}>
        {income.length > 0 && <Divider label="Ingresos" />}
        {income.map((it, i) => (
          <Row key={`i${i}`} icon={TYPE_META.income.icon} color={TYPE_META.income.color} name={it.source || it.name} type="Ingreso · neto" amount={money(it.net ?? it.total ?? it.gross, currency)} positive />
        ))}
        {expenses.length > 0 && <Divider label="Gastos fijos" />}
        {expenses.map((it, i) => {
          const meta = TYPE_META[it.type] || { color: 'var(--t2)', label: it.type, icon: '•' };
          return <Row key={`e${i}`} icon={meta.icon} color={meta.color} name={it.name} type={`${meta.label}`} amount={`−${money(it.amount, currency)}`} />;
        })}
        {income.length === 0 && expenses.length === 0 && <div className="empty-sub" style={{ padding: 16, color: 'var(--t3)' }}>Sin registros en esta quincena</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <span className="mute" style={{ fontSize: 11.5 }}>Disponible tras fijos</span>
        <span className="num pos" style={{ fontSize: 16, fontWeight: 700 }}>{money(q.net_available, currency)}</span>
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 4px' }}>
      <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t3)' }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}
function Row({ icon, color, name, type, amount, positive }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: 'var(--s2)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{type}
        </div>
      </div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: positive ? 'var(--accent)' : 'var(--red)' }}>{amount}</div>
    </div>
  );
}

export default function Quincenas() {
  const { currency } = useTheme();
  const [month, setMonth] = useState(curMonth());
  const q = useFetch('/api/quincenas', { params: { month } });

  const data = q.data || {};
  const quincenas = useMemo(() => data.quincenas || [], [data]);
  const [y, m] = month.split('-').map(Number);
  const now = curMonth();

  return (
    <>
      <PageHeader title={`Quincenas · ${MONTHS[m - 1]} ${y}`}>
        <div className="seg">
          <button onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <button className="on" onClick={() => setMonth(now)}>Hoy</button>
          <button onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading rows={4} /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : quincenas.length === 0 ? (
          <EmptyState title="Sin datos de quincenas" sub="Agrega fuentes de ingreso, servicios y préstamos para ver el desglose" />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              {Object.values(TYPE_META).map((t) => (
                <span key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--t2)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: t.color }} />{t.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {quincenas.map((qq) => (
                <QuincenaCard key={qq.quincena} q={qq} currency={currency} isCurrent={month === now && qq.quincena === (new Date().getDate() <= 15 ? 1 : 2)} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
