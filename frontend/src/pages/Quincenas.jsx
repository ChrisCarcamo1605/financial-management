import { useState, useMemo, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import { money, fmtDate } from '../lib/format';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function curMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── Icons ─────────────────────────────────────────────────────────── */
function IconIncome() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v14M5 4h4.5a2.5 2.5 0 010 5H5m0-5H3m2 5h5.5a2.5 2.5 0 010 5H5m0-5v5M3 14h2"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconService() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8A5.5 5.5 0 012.5 8M2.5 8l2-2M2.5 8l2 2"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconLoan() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 6h14M5 9.5h2M10 9.5h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconSavings() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 9a5 5 0 0010 0v1h1.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H2.5a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5H4V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 13v1M9 13v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="7" r="1" fill="currentColor" />
      <path d="M7 4V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Shared sub-components ─────────────────────────────────────────── */
function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 4px' }}>
      <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t3)' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function Row({ Icon, color, name, sub, amount, positive }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}>
        <Icon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        {sub && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {sub}
          </div>
        )}
      </div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: positive ? 'var(--accent)' : 'var(--red)', flexShrink: 0 }}>
        {amount}
      </div>
    </div>
  );
}

function Pill({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t3)', marginBottom: 3 }}>
        {label}
      </div>
      <div className="num" style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}

/* ── QuincenaCard ──────────────────────────────────────────────────── */
function QuincenaCard({ q, idx, currency, isCurrent, savingsGoals }) {
  const payments  = Array.isArray(q.payments) ? q.payments : [];
  const services  = Array.isArray(q.services) ? q.services : [];
  const income    = Number(q.income    || 0);
  const expenses  = Number(q.expenses  || 0);
  const qNum      = idx + 1; // 1 or 2

  // savings contributions for this quincena
  // per_quincena_q1/q2 are null when never explicitly configured → split evenly
  const savingsRows = useMemo(() => (savingsGoals || [])
    .filter((g) => g.active)
    .map((g) => {
      const total = Number(g.per_quincena || 0);
      let amt;
      if (g.per_quincena_q1 != null && g.per_quincena_q2 != null) {
        // explicit split configured by the user
        amt = qNum === 1 ? Number(g.per_quincena_q1) : Number(g.per_quincena_q2);
      } else {
        // not configured yet — split evenly
        amt = total / 2;
      }
      return amt > 0 ? { id: g.id, name: g.name, amount: amt, icon: g.icon, iconType: g.iconType, color: g.color } : null;
    })
    .filter(Boolean), [savingsGoals, qNum]);

  const totalSavings = savingsRows.reduce((a, r) => a + r.amount, 0);
  const totalFixed   = expenses + totalSavings;
  const available    = income - totalFixed;

  const sortedServices = [...services].sort((a, b) => (a.day || 0) - (b.day || 0));
  const sortedPayments = [...payments].sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
  const hasAny = income > 0 || sortedServices.length > 0 || sortedPayments.length > 0 || savingsRows.length > 0;

  return (
    <div className="panel" style={isCurrent ? { borderColor: 'var(--accent-border)' } : undefined}>
      {/* header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Q{qNum}</span>
            <span className="mute" style={{ fontSize: 11.5 }}>
              {fmtDate(q.start, 'd MMM')} — {fmtDate(q.end, 'd MMM')}
            </span>
          </div>
          <span className="chip" style={isCurrent ? { color: 'var(--accent)', background: 'var(--accent-bg)' } : undefined}>
            {isCurrent ? 'En curso' : 'Cerrada'}
          </span>
        </div>
        <div className="g3" style={{ gap: 8 }}>
          <Pill label="Ingreso"   value={money(income,      currency)} color="var(--accent)" />
          <Pill label="Fijos + ahorro" value={money(totalFixed, currency)} color="var(--red)"    />
          <Pill label="Libre"     value={money(available,   currency)} color={available < 0 ? 'var(--red)' : undefined} />
        </div>
      </div>

      {/* rows */}
      <div style={{ padding: 8 }}>
        {income > 0 && (
          <>
            <Divider label="Ingresos" />
            <Row
              Icon={IconIncome}
              color="var(--accent)"
              name="Ingreso neto"
              sub="Fuentes de ingreso"
              amount={money(income, currency)}
              positive
            />
          </>
        )}

        {(sortedServices.length > 0 || sortedPayments.length > 0) && (
          <Divider label="Gastos fijos" />
        )}
        {sortedServices.map((s) => (
          <Row
            key={`s${s.id}`}
            Icon={() => <Icon icon={s.icon} iconType={s.iconType} size={14} />}
            color="var(--red)"
            name={s.name}
            sub={`Servicio · día ${s.day}`}
            amount={`−${money(s.amount, currency)}`}
          />
        ))}
        {sortedPayments.map((p) => (
          <Row
            key={`p${p.id}`}
            Icon={IconLoan}
            color="var(--amber)"
            name={p.loan_name || 'Préstamo'}
            sub={`Cuota ${p.installment_number} · ${fmtDate(p.due_date, 'd MMM')}`}
            amount={`−${money(p.amount, currency)}`}
          />
        ))}

        {savingsRows.length > 0 && <Divider label="Ahorro" />}
        {savingsRows.map((s) => (
          <Row
            key={`sv${s.id}`}
            Icon={() => <Icon icon={s.icon} iconType={s.iconType} size={14} />}
            color={s.color || 'var(--violet)'}
            name={s.name}
            sub="Ahorro automático"
            amount={`−${money(s.amount, currency)}`}
          />
        ))}

        {!hasAny && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--t3)', fontSize: 12.5 }}>
            Sin registros en esta quincena
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        <span className="mute" style={{ fontSize: 11.5 }}>Disponible tras fijos y ahorro</span>
        <span className="num" style={{ fontSize: 16, fontWeight: 700, color: available >= 0 ? 'var(--accent)' : 'var(--red)' }}>
          {money(available, currency)}
        </span>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function Quincenas() {
  const { currency } = useTheme();
  const [month, setMonth] = useState(curMonth);
  const q = useFetch('/api/quincenas', { params: { month } });
  const goalsQ = useFetch('/api/savings-goals', { select: (d) => d.data || d.goals || d });

  const data        = q.data || {};
  const quincenas   = useMemo(() => (Array.isArray(data.quincenas) ? data.quincenas : []), [data]);
  const savingsGoals = useMemo(() => (Array.isArray(goalsQ.data) ? goalsQ.data : []), [goalsQ.data]);
  const [y, m]      = month.split('-').map(Number);
  const now         = curMonth();

  const LEGEND = [
    { color: 'var(--accent)',  label: 'Ingreso'  },
    { color: 'var(--red)',     label: 'Servicio'  },
    { color: 'var(--amber)',   label: 'Préstamo'  },
    { color: 'var(--violet)',  label: 'Ahorro'    },
  ];

  return (
    <>
      <PageHeader title={`Quincenas · ${MONTHS[m - 1]} ${y}`}>
        <div className="seg">
          <button onClick={() => setMonth(shiftMonth(month, -1))}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className={month === now ? 'on' : ''} onClick={() => setMonth(now)}>Hoy</button>
          <button onClick={() => setMonth(shiftMonth(month, 1))}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </PageHeader>

      <div className="content">
        {q.loading ? (
          <Loading rows={4} />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : quincenas.length === 0 ? (
          <EmptyState
            title="Sin datos de quincenas"
            sub="Agrega fuentes de ingreso, servicios y préstamos para ver el desglose"
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              {LEGEND.map((l) => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--t2)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>

            <div className="q-grid g2" style={{ gap: 12 }}>
              {quincenas.map((qq, idx) => (
                <QuincenaCard
                  key={idx}
                  q={qq}
                  idx={idx}
                  currency={currency}
                  isCurrent={month === now && idx === (new Date().getDate() <= 15 ? 0 : 1)}
                  savingsGoals={savingsGoals}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
