import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { ProgressRing } from '../components/charts/Charts';
import Icon from '../components/Icon';
import IconPicker from '../components/IconPicker';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, fmtDate, isoDate } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

const COLORS = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#3b82f6'];

function GoalModal({ goal, accounts, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (goal) {
      return {
        name: goal.name || '',
        target_amount: String(goal.target_amount || ''),
        q1: goal.per_quincena_q1 != null ? String(goal.per_quincena_q1) : '',
        q2: goal.per_quincena_q2 != null ? String(goal.per_quincena_q2) : '',
        account_id: String(goal.account_id || ''),
        day_q1: String(goal.day_q1 || ''),
        day_q2: String(goal.day_q2 || ''),
        current_amount: String(goal.current_amount || 0),
        color: goal.color || '#10b981',
        icon: goal.icon || 'savings',
        iconType: 'registry',
      };
    }
    return { name: '', target_amount: '', q1: '', q2: '', account_id: '', day_q1: '', day_q2: '', current_amount: '0', color: '#10b981', icon: 'savings', iconType: 'registry' };
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [confirmDelete, ConfirmUI] = useConfirm();

  const q1num = Number(form.q1 || 0);
  const q2num = Number(form.q2 || 0);
  const total = q1num + q2num;

  async function save() {
    if (!form.name || !form.target_amount) { toast.error('Escribe nombre y monto meta'); return; }
    setBusy(true);
    const payload = {
      name: form.name,
      target_amount: Number(form.target_amount),
      per_quincena: total,
      per_quincena_q1: q1num || null,
      account_id: form.account_id ? Number(form.account_id) : null,
      day_q1: form.day_q1 ? Number(form.day_q1) : null,
      day_q2: form.day_q2 ? Number(form.day_q2) : null,
      current_amount: Number(form.current_amount || 0),
      color: form.color,
      icon: form.icon,
      iconType: 'registry',
    };
    try {
      if (goal?.id) await api.put(`/api/savings-goals/${goal.id}`, payload);
      else await api.post('/api/savings-goals', payload);
      toast.success(goal ? 'Meta actualizada' : 'Meta creada');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.error || 'Error al guardar'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!await confirmDelete({ title: '¿Eliminar meta?', message: 'Se eliminarán todos los aportes registrados.' })) return;
    try { await api.delete(`/api/savings-goals/${goal.id}`); toast.success('Eliminada'); onSaved(); }
    catch { toast.error('No se pudo eliminar'); }
  }

  return (
    <Modal title={goal ? 'Editar meta' : 'Nueva meta de ahorro'} onClose={onClose} footer={
      <>
        {goal?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field"><label>Nombre</label><input value={form.name} onChange={set('name')} placeholder="Fondo emergencia" /></div>
      <div className="field"><label>Monto meta</label><input type="number" step="0.01" value={form.target_amount} onChange={set('target_amount')} /></div>

      {/* Aportes Q1 / Q2 */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '12px 14px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t3)', marginBottom: 10 }}>
          Aporte automático por quincena
        </div>
        <div className="field-row">
          <div className="field"><label>Q1 · monto (días 1–15)</label><input type="number" step="0.01" min="0" value={form.q1} onChange={set('q1')} placeholder="0.00" /></div>
          <div className="field"><label>Día de Q1</label><input type="number" min="1" max="15" value={form.day_q1} onChange={set('day_q1')} placeholder="15" /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Q2 · monto (días 16–fin)</label><input type="number" step="0.01" min="0" value={form.q2} onChange={set('q2')} placeholder="0.00" /></div>
          <div className="field"><label>Día de Q2</label><input type="number" min="16" max="31" value={form.day_q2} onChange={set('day_q2')} placeholder="30" /></div>
        </div>
        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--t2)' }}>
            <span>Total mensual</span>
            <span className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>${total.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Cuenta para generación automática */}
      <div className="field">
        <label>Cuenta (para generar transacción)</label>
        <select value={form.account_id} onChange={set('account_id')}>
          <option value="">Sin cuenta — solo manual</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {!goal?.id && <div className="field"><label>Ahorro inicial</label><input type="number" step="0.01" value={form.current_amount} onChange={set('current_amount')} /></div>}
      <div className="field"><label>Color</label><div className="swatches">{COLORS.map((c) => <span key={c} className={`sw${form.color === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => setForm((f) => ({ ...f, color: c }))} />)}</div></div>
      <div className="field"><label>Icono</label><IconPicker value={form.icon} onChange={(key) => setForm((f) => ({ ...f, icon: key }))} /></div>
      {ConfirmUI}
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onSaved }) {
  const [amount, setAmount] = useState(goal.per_quincena || '');
  const [date, setDate] = useState(isoDate());
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!amount) { toast.error('Escribe un monto'); return; }
    setBusy(true);
    try {
      await api.post(`/api/savings-goals/${goal.id}/contribute`, { amount: Number(amount), date, source: 'manual' });
      toast.success('Aporte registrado');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.error || 'Error'); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={`Aportar a ${goal.name}`} onClose={onClose} maxWidth={380} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Aportar'}</button>
      </>
    }>
      <div className="field-row">
        <div className="field"><label>Monto</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
        <div className="field"><label>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

function curPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function GenerateBtn({ goal, currency, onGenerated }) {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const qNum = new Date().getDate() <= 15 ? 1 : 2;

  if (!goal.account_id) {
    return <span className="mute" style={{ fontSize: 11.5 }}>Sin cuenta</span>;
  }
  const amt = qNum === 1
    ? (goal.per_quincena_q1 ?? goal.per_quincena / 2)
    : (goal.per_quincena_q2 ?? goal.per_quincena / 2);

  if (!amt) {
    return <span className="mute" style={{ fontSize: 11.5 }}>Monto Q{qNum} = 0</span>;
  }
  if (status === 'exists') {
    return <span className="chip" style={{ color: 'var(--t3)', fontSize: 11 }}><span className="dot" style={{ background: 'var(--t3)' }} />Q{qNum} generado</span>;
  }
  if (status === 'done') {
    return <span className="chip" style={{ color: 'var(--accent)', fontSize: 11 }}><span className="dot" style={{ background: 'var(--accent)' }} />{money(result?.amount, currency)}</span>;
  }
  async function generate() {
    setStatus('busy');
    try {
      const { data, status: http } = await api.post(
        `/api/savings-goals/${goal.id}/generate`,
        { month: curPeriod(), quincena: qNum },
        { validateStatus: (s) => s < 500 }
      );
      if (http === 201) { setStatus('done'); setResult(data); toast.success(`Q${qNum} generado · ${money(data.amount, currency)}`); onGenerated?.(); }
      else if (http === 200) { setStatus('exists'); }
      else { setStatus('idle'); toast.error(data?.reason || 'No se pudo generar'); }
    } catch { setStatus('idle'); toast.error('Error al generar'); }
  }
  return (
    <button className="btn btn-soft" style={{ padding: '4px 11px', fontSize: 11.5 }} disabled={status === 'busy'} onClick={generate}>
      {status === 'busy'
        ? <span className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
        : <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
      Q{qNum}
    </button>
  );
}

export default function Savings() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contrib, setContrib] = useState(null);
  const q = useFetch('/api/savings-goals', { select: (d) => d.data || d.goals || d });
  const accountsQ = useFetch('/api/accounts', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const goals = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const accounts = useMemo(() => (Array.isArray(accountsQ.data) ? accountsQ.data : []), [accountsQ.data]);
  const [confirmContrib, ConfirmContribUI] = useConfirm();

  const totalSaved = goals.reduce((a, g) => a + Number(g.current_amount || 0), 0);
  const totalTarget = goals.reduce((a, g) => a + Number(g.target_amount || 0), 0);
  const perQuincena = goals.filter((g) => g.active).reduce((a, g) => a + Number(g.per_quincena || 0), 0);
  const history = useMemo(() => goals.flatMap((g) => (g.contributions || []).map((c) => ({ ...c, goal_name: g.name, color: g.color }))).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12), [goals]);

  function onSaved() { setOpen(false); setEditing(null); setContrib(null); q.refetch(); }

  return (
    <>
      <PageHeader title="Ahorros">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon /> Nueva meta</button>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading rows={3} /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : goals.length === 0 ? (
          <EmptyState title="Sin metas de ahorro" sub="Crea tu primera meta y define un aporte por quincena" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><PlusIcon /> Nueva meta</button>} />
        ) : (
          <>
            <div className="stats g4">
              <div className="stat"><div className="stat-lbl">Total ahorrado</div><div className="stat-val pos num">{money(totalSaved, currency)}</div></div>
              <div className="stat"><div className="stat-lbl">Meta global</div><div className="stat-val num">{money(totalTarget, currency)}</div><div className="stat-delta">{totalTarget ? Math.round(totalSaved / totalTarget * 100) : 0}% completado</div></div>
              <div className="stat"><div className="stat-lbl">Aporte / quincena</div><div className="stat-val num">{money(perQuincena, currency)}</div></div>
              <div className="stat"><div className="stat-lbl">Metas activas</div><div className="stat-val num">{goals.filter((g) => g.active).length}</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12, marginBottom: 18 }}>
              {goals.map((g) => {
                const color = g.color || '#10b981';
                return (
                  <div key={g.id} className="panel panel-pad">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}><Icon icon={g.icon} iconType={g.iconType} size={18} /></div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div><div className="mute" style={{ fontSize: 11 }}>Meta: {money(g.target_amount, currency)}</div></div>
                      <span className="panel-link" onClick={() => { setEditing(g); setOpen(true); }}>Editar</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                      <ProgressRing pct={g.percentage || 0} color={color} />
                      <div style={{ flex: 1 }}>
                        <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{money(g.current_amount, currency)}</div>
                        <div className="mute num" style={{ fontSize: 11 }}>de {money(g.target_amount, currency)}</div>
                        <div className="num" style={{ fontSize: 11, color: 'var(--t2)', marginTop: 6 }}>Faltan {money(g.remaining, currency)}</div>
                      </div>
                    </div>
                    {/* days + amounts info */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {g.per_quincena_q1 != null ? (
                        <>
                          <span className="chip" style={{ fontSize: 11 }}>Q1 <b className="num" style={{ color }}>{money(g.per_quincena_q1, currency)}</b>{g.day_q1 ? ` · día ${g.day_q1}` : ''}</span>
                          <span className="chip" style={{ fontSize: 11 }}>Q2 <b className="num" style={{ color }}>{money(g.per_quincena_q2, currency)}</b>{g.day_q2 ? ` · día ${g.day_q2}` : ''}</span>
                        </>
                      ) : (
                        <span className="chip" style={{ fontSize: 11 }}>Mensual <b className="num" style={{ color }}>{money(g.per_quincena, currency)}</b></span>
                      )}
                      {g.account_name && <span className="chip mute" style={{ fontSize: 11 }}>{g.account_name}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)', gap: 6 }}>
                      <GenerateBtn goal={g} currency={currency} onGenerated={q.refetch} />
                      <button className="btn btn-soft" style={{ padding: '5px 11px', fontSize: 11.5 }} onClick={() => setContrib(g)}>+ Manual</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {history.length > 0 && (
              <div className="tbl-wrap">
                <div className="panel-head"><span className="panel-title">Historial de aportes</span></div>
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Meta</th><th>Origen</th><th style={{ textAlign: 'right' }}>Monto</th><th></th></tr>
                  </thead>
                  <tbody>
                    {history.map((c) => (
                      <tr key={c.id}>
                        <td className="mute">{fmtDate(c.date)}</td>
                        <td><span className="chip"><span className="dot" style={{ background: c.color || 'var(--accent)' }} />{c.goal_name}</span></td>
                        <td className="mute">{c.source || 'manual'}</td>
                        <td className="amt pos">+{money(c.amount, currency)}</td>
                        <td>
                          <button
                            title="Eliminar aporte"
                            style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: '2px 6px', borderRadius: 5, fontSize: 14 }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--red)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--t3)'}
                            onClick={async () => {
                              if (!await confirmContrib({ title: '¿Eliminar aporte?', message: 'Se descontará del total ahorrado.' })) return;
                              try {
                                await api.delete(`/api/savings-goals/contributions/${c.id}`);
                                toast.success('Aporte eliminado');
                                q.refetch();
                              } catch (err) {
                                toast.error(err?.response?.data?.error || 'No se pudo eliminar');
                              }
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {ConfirmContribUI}
      </div>
      {open && <GoalModal goal={editing} accounts={accounts} onClose={() => setOpen(false)} onSaved={onSaved} />}
      {contrib && <ContributeModal goal={contrib} onClose={() => setContrib(null)} onSaved={onSaved} />}
    </>
  );
}
