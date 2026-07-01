import { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import { money, fmtDate, fmtDateShort } from '../lib/format';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function curMonth() {
  const d = new Date();
  // Días 30-31 pertenecen a Q1 del mes siguiente
  const ref = d.getDate() >= 30 ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : d;
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
}
function isQ1Today() {
  const day = new Date().getDate();
  return day <= 14 || day >= 30;
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

function Row({ Icon: IconComp, color, name, sub, amount, positive }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}>
        <IconComp />
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

/* ── IncomeSourceRow ─────────────────────────────────────────────────
   Shows a single income source with its quincena-specific amounts
   and optional deduction breakdown.                                    */
const MOD_LABELS = {
  planilla: 'Planilla',
  servicios_profesionales: 'Serv. profesionales',
  pension: 'Pensión',
};

function IncomeSourceRow({ source, currency }) {
  const sched = source.pay_schedule === 'biweekly'
    ? 'Quincenal'
    : `Mensual · día ${source.pay_day || '—'}`;
  const hasDeductions = (source.isss > 0) || (source.afp > 0) || (source.isr > 0);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
        color: 'var(--accent)',
      }}>
        <IconIncome />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.name}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>
          {MOD_LABELS[source.modality] || source.modality} · {sched}
        </div>
        {hasDeductions && (
          <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span>Bruto {money(source.gross_amount, currency)}</span>
            {source.isss > 0 && <span>· ISSS −{money(source.isss, currency)}</span>}
            {source.afp > 0 && <span>· AFP −{money(source.afp, currency)}</span>}
            {source.isr > 0 && <span>· ISR −{money(source.isr, currency)}</span>}
          </div>
        )}
      </div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginTop: hasDeductions ? 4 : 0 }}>
        {money(source.net_amount, currency)}
      </div>
    </div>
  );
}

/* ── ServiceRow ──────────────────────────────────────────────────────
   Service row with paid / pending badge.                               */
function ServiceRow({ service, paid, currency, actualAmount }) {
  const color = 'var(--red)';
  const displayAmt = actualAmount ?? service.amount;
  const hasDiff = actualAmount != null && Math.abs(actualAmount - service.amount) >= 0.01;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}>
        <Icon icon={service.icon} iconType={service.iconType} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {service.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          {`Servicio · día ${service.day}`}
          {hasDiff && <span>· conf. {money(service.amount, currency)}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 7px',
          background: paid
            ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
            : 'color-mix(in srgb, var(--amber) 15%, transparent)',
          color: paid ? 'var(--accent)' : 'var(--amber)',
        }}>
          {paid ? '✓ Pagado' : 'Pendiente'}
        </span>
        <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color, flexShrink: 0 }}>
          −{money(displayAmt, currency)}
        </div>
      </div>
    </div>
  );
}

/* ── TxRow ───────────────────────────────────────────────────────────
   Renders a single actual transaction in "reales" mode.               */
function TxRow({ tx, currency }) {
  const isIncome = tx.type === 'income';
  const color = tx.category_color || (isIncome ? 'var(--accent)' : 'var(--red)');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}>
        <Icon icon={tx.category_icon} iconType={tx.category_icon_type} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tx.description || tx.category_name || '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          {tx.category_name} · {fmtDateShort(tx.date)}
        </div>
      </div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: isIncome ? 'var(--accent)' : 'var(--red)', flexShrink: 0 }}>
        {isIncome ? '+' : '−'}{money(tx.amount, currency)}
      </div>
    </div>
  );
}

/* ── QuincenaCard ──────────────────────────────────────────────────── */
function QuincenaCard({ q, idx, currency, isCurrent, savingsGoals, mode }) {
  const payments       = Array.isArray(q.payments)       ? q.payments       : [];
  const services       = Array.isArray(q.services)       ? q.services       : [];
  const incomeSources  = Array.isArray(q.income_sources) ? q.income_sources : [];
  const transactions   = Array.isArray(q.transactions)   ? q.transactions   : [];
  const income         = Number(q.income  || 0);
  const expenses       = Number(q.expenses || 0);
  const qNum           = idx + 1;

  // savings contributions for this quincena
  const savingsRows = useMemo(() => (savingsGoals || [])
    .filter((g) => g.active)
    .map((g) => {
      const total = Number(g.per_quincena || 0);
      let amt;
      if (g.per_quincena_q1 != null && g.per_quincena_q2 != null) {
        amt = qNum === 1 ? Number(g.per_quincena_q1) : Number(g.per_quincena_q2);
      } else {
        amt = total / 2;
      }
      return amt > 0 ? { id: g.id, name: g.name, amount: amt, icon: g.icon, iconType: g.iconType, color: g.color } : null;
    })
    .filter(Boolean), [savingsGoals, qNum]);

  const totalSavings = savingsRows.reduce((a, r) => a + r.amount, 0);
  const totalFixed   = expenses + totalSavings;
  const available    = income - totalFixed;

  // Mapa service_id → transacción generada por ese servicio
  const serviceTxMap = useMemo(() => {
    const map = {};
    transactions.forEach((t) => { if (t.recurring_service_id != null) map[t.recurring_service_id] = t; });
    return map;
  }, [transactions]);

  const paidServiceIds = useMemo(() => new Set(Object.keys(serviceTxMap).map(Number)), [serviceTxMap]);

  // Gastos reales: solo expenses que NO son de un servicio (esos ya están en la fila del servicio)
  const expenseTxs = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && t.recurring_service_id == null),
    [transactions],
  );
  const incomeTxs  = useMemo(() => transactions.filter((t) => t.type === 'income'), [transactions]);
  const realIncome  = useMemo(() => incomeTxs.reduce((a, t) => a + Number(t.amount), 0), [incomeTxs]);
  const realExpense = useMemo(() => transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0), [transactions]);
  const realNet     = realIncome - realExpense;

  const sortedServices = [...services].sort((a, b) => (a.day || 0) - (b.day || 0));
  const sortedPayments = [...payments].sort((a, b) => (a.due_date > b.due_date ? 1 : -1));

  const isFixed   = mode === 'fixed';
  const hasIncome = incomeSources.length > 0 || income > 0;
  const hasFixed  = sortedServices.length > 0 || sortedPayments.length > 0 || savingsRows.length > 0;

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

        {isFixed ? (
          <div className="g3" style={{ gap: 8 }}>
            <Pill label="Ingreso"        value={money(income,     currency)} color="var(--accent)" />
            <Pill label="Fijos + ahorro" value={money(totalFixed, currency)} color="var(--red)"    />
            <Pill label="Libre"          value={money(available,  currency)} color={available < 0 ? 'var(--red)' : undefined} />
          </div>
        ) : (
          <div className="g3" style={{ gap: 8 }}>
            <Pill label="Ingreso real"  value={money(realIncome,  currency)} color="var(--accent)" />
            <Pill label="Gastos reales" value={money(realExpense, currency)} color="var(--red)"    />
            <Pill label="Neto real"     value={money(realNet,     currency)} color={realNet < 0 ? 'var(--red)' : undefined} />
          </div>
        )}
      </div>

      {/* rows */}
      <div style={{ padding: 8 }}>

        {/* Income sources — always shown in both modes */}
        {hasIncome && <Divider label="Ingresos" />}
        {incomeSources.length > 0
          ? incomeSources.map((src) => (
              <IncomeSourceRow key={src.id} source={src} currency={currency} />
            ))
          : income > 0 && (
              <Row
                Icon={IconIncome}
                color="var(--accent)"
                name="Ingreso neto"
                sub="Fuentes de ingreso"
                amount={money(income, currency)}
                positive
              />
            )
        }

        {/* Services, loans, savings — always visible in both modes */}
        {(sortedServices.length > 0 || sortedPayments.length > 0) && (
          <Divider label="Gastos fijos" />
        )}
        {sortedServices.map((s) => (
          <ServiceRow
            key={`s${s.id}`}
            service={s}
            paid={paidServiceIds.has(s.id)}
            currency={currency}
            actualAmount={!isFixed && serviceTxMap[s.id] ? Number(serviceTxMap[s.id].amount) : undefined}
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

        {!hasIncome && !hasFixed && isFixed && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--t3)', fontSize: 12.5 }}>
            Sin registros en esta quincena
          </div>
        )}

        {/* Reales mode: income + expense actual transactions */}
        {!isFixed && (
          <>
            <Divider label={incomeTxs.length > 0 ? `Ingresos reales · ${incomeTxs.length}` : 'Ingresos reales'} />
            {incomeTxs.length > 0
              ? incomeTxs.map((t) => <TxRow key={t.id} tx={t} currency={currency} />)
              : (
                <div style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--t3)', fontSize: 12.5 }}>
                  Sin ingresos registrados en este período
                </div>
              )
            }

            <Divider label={expenseTxs.length > 0 ? `Gastos reales · ${expenseTxs.length}` : 'Gastos reales'} />
            {expenseTxs.length > 0
              ? expenseTxs.map((t) => <TxRow key={t.id} tx={t} currency={currency} />)
              : (
                <div style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--t3)', fontSize: 12.5 }}>
                  Sin gastos registrados en este período
                </div>
              )
            }
          </>
        )}
      </div>

      {/* footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        {isFixed ? (
          <>
            <span className="mute" style={{ fontSize: 11.5 }}>Disponible tras fijos y ahorro</span>
            <span className="num" style={{ fontSize: 16, fontWeight: 700, color: available >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {money(available, currency)}
            </span>
          </>
        ) : (
          <>
            <span className="mute" style={{ fontSize: 11.5 }}>Neto real del período</span>
            <span className="num" style={{ fontSize: 16, fontWeight: 700, color: realNet >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {money(realNet, currency)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function Quincenas() {
  const { currency } = useTheme();
  const [month, setMonth] = useState(curMonth);
  const [mode, setMode] = useState('fixed');
  const q = useFetch('/api/quincenas', { params: { month } });
  const goalsQ = useFetch('/api/savings-goals', { select: (d) => d.data || d.goals || d });

  const data         = q.data || {};
  const quincenas    = useMemo(() => (Array.isArray(data.quincenas) ? data.quincenas : []), [data]);
  const savingsGoals = useMemo(() => (Array.isArray(goalsQ.data) ? goalsQ.data : []), [goalsQ.data]);
  const [y, m]       = month.split('-').map(Number);
  const now          = curMonth();

  const LEGEND_FIXED = [
    { color: 'var(--accent)', label: 'Ingreso'  },
    { color: 'var(--red)',    label: 'Servicio'  },
    { color: 'var(--amber)',  label: 'Préstamo'  },
    { color: 'var(--violet)', label: 'Ahorro'    },
  ];
  const LEGEND_REAL = [
    { color: 'var(--accent)', label: 'Ingreso'  },
    { color: 'var(--red)',    label: 'Gasto'     },
  ];
  const legend = mode === 'fixed' ? LEGEND_FIXED : LEGEND_REAL;

  return (
    <>
      <PageHeader title={`Quincenas · ${MONTHS[m - 1]} ${y}`}>
        <div className="seg">
          <button className={mode === 'fixed' ? 'on' : ''} onClick={() => setMode('fixed')}>Fijos</button>
          <button className={mode === 'actual' ? 'on' : ''} onClick={() => setMode('actual')}>Reales</button>
        </div>
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
              {legend.map((l) => (
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
                  isCurrent={month === now && idx === (isQ1Today() ? 0 : 1)}
                  savingsGoals={savingsGoals}
                  mode={mode}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
