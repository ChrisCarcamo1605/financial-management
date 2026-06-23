import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { ProgressRing } from '../components/charts/Charts';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, fmtDate, isoDate } from '../lib/format';

const COLORS = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#3b82f6'];
const ICONS = ['🏠', '✈️', '💻', '🚗', '🎓', '🐖', '💍', '🏖️'];

function GoalModal({ goal, onClose, onSaved }) {
  const [form, setForm] = useState(goal ? { ...goal } : { name: '', target_amount: '', per_quincena: '', current_amount: 0, color: '#10b981', icon: '🏠', iconType: 'emoji' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name || !form.target_amount) { toast.error('Escribe nombre y monto meta'); return; }
    setBusy(true);
    const payload = {
      name: form.name, target_amount: Number(form.target_amount), per_quincena: Number(form.per_quincena || 0),
      current_amount: Number(form.current_amount || 0), color: form.color, icon: form.icon, iconType: 'emoji',
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
    if (!confirm('¿Eliminar meta y sus aportes?')) return;
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
      <div className="field-row">
        <div className="field"><label>Monto meta</label><input type="number" step="0.01" value={form.target_amount} onChange={set('target_amount')} /></div>
        <div className="field"><label>Aporte / quincena</label><input type="number" step="0.01" value={form.per_quincena} onChange={set('per_quincena')} /></div>
      </div>
      {!goal?.id && <div className="field"><label>Ahorro inicial</label><input type="number" step="0.01" value={form.current_amount} onChange={set('current_amount')} /></div>}
      <div className="field"><label>Color</label><div className="swatches">{COLORS.map((c) => <span key={c} className={`sw${form.color === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => setForm((f) => ({ ...f, color: c }))} />)}</div></div>
      <div className="field"><label>Icono</label><div className="icon-grid">{ICONS.map((ic) => <span key={ic} className={`ic-opt${form.icon === ic ? ' sel' : ''}`} onClick={() => setForm((f) => ({ ...f, icon: ic }))}>{ic}</span>)}</div></div>
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

export default function Savings() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contrib, setContrib] = useState(null);
  const q = useFetch('/api/savings-goals', { select: (d) => d.data || d.goals || d });
  const goals = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);

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
            <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
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
                      <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>{g.icon || '🐖'}</div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <span className="mute" style={{ fontSize: 11 }}>Aporte/quincena <b className="num" style={{ color }}>{money(g.per_quincena, currency)}</b></span>
                      <button className="btn btn-soft" style={{ padding: '5px 11px' }} onClick={() => setContrib(g)}>+ Aportar</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {history.length > 0 && (
              <div className="tbl-wrap">
                <div className="panel-head"><span className="panel-title">Historial de aportes</span></div>
                <table>
                  <thead><tr><th>Fecha</th><th>Meta</th><th>Origen</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
                  <tbody>
                    {history.map((c) => (
                      <tr key={c.id}>
                        <td className="mute">{fmtDate(c.date)}</td>
                        <td><span className="chip"><span className="dot" style={{ background: c.color || 'var(--accent)' }} />{c.goal_name}</span></td>
                        <td className="mute">{c.source || 'manual'}</td>
                        <td className="amt pos">+{money(c.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      {open && <GoalModal goal={editing} onClose={() => setOpen(false)} onSaved={onSaved} />}
      {contrib && <ContributeModal goal={contrib} onClose={() => setContrib(null)} onSaved={onSaved} />}
    </>
  );
}
