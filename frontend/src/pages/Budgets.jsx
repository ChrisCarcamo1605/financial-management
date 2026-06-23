import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, isoDate } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: isoDate(start), end: isoDate(end) };
}

function BudgetModal({ budget, categories, onClose, onSaved }) {
  const mb = monthBounds();
  const [form, setForm] = useState(budget ? { ...budget } : { category_id: '', amount: '', period: 'monthly', start_date: mb.start, end_date: mb.end });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const [confirmDelete, ConfirmUI] = useConfirm();

  async function save() {
    if (!form.category_id || !form.amount) { toast.error('Elige categoría y monto'); return; }
    setBusy(true);
    const payload = { category_id: Number(form.category_id), amount: Number(form.amount), period: form.period, start_date: form.start_date, end_date: form.end_date };
    try {
      if (budget?.id) await api.put(`/api/budgets/${budget.id}`, payload);
      else await api.post('/api/budgets', payload);
      toast.success(budget ? 'Presupuesto actualizado' : 'Presupuesto creado');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!await confirmDelete({ title: '¿Eliminar presupuesto?' })) return;
    try { await api.delete(`/api/budgets/${budget.id}`); toast.success('Eliminado'); onSaved(); }
    catch { toast.error('No se pudo eliminar'); }
  }

  return (
    <Modal title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={onClose} footer={
      <>
        {budget?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field">
        <label>Categoría (gasto)</label>
        <select value={form.category_id} onChange={set('category_id')}>
          <option value="">Selecciona…</option>
          {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field-row">
        <div className="field"><label>Límite</label><input type="number" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" /></div>
        <div className="field"><label>Periodo</label><select value={form.period} onChange={set('period')}><option value="monthly">Mensual</option><option value="weekly">Semanal</option></select></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Inicio</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="field"><label>Fin</label><input type="date" value={form.end_date} onChange={set('end_date')} /></div>
      </div>
      {ConfirmUI}
    </Modal>
  );
}

export default function Budgets() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const q = useFetch('/api/budgets', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const categoriesQ = useFetch('/api/categories', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const budgets = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const categories = useMemo(() => (Array.isArray(categoriesQ.data) ? categoriesQ.data : []), [categoriesQ.data]);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }

  return (
    <>
      <PageHeader title="Presupuestos">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon /> Nuevo presupuesto</button>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : budgets.length === 0 ? (
          <EmptyState title="Sin presupuestos" sub="Crea un límite de gasto por categoría" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><PlusIcon /> Nuevo presupuesto</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
            {budgets.map((b) => {
              const p = Number(b.percentage ?? ((Number(b.spent) / Number(b.amount)) * 100 || 0));
              const cls = p >= 100 ? 'over' : p >= 85 ? 'warn' : '';
              return (
                <div key={b.id} className="panel panel-pad" style={{ cursor: 'pointer' }} onClick={() => { setEditing(b); setOpen(true); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${b.category_color || 'var(--accent)'} 16%, transparent)`, color: b.category_color || 'var(--accent)', flexShrink: 0 }}>
                        <Icon icon={b.category_icon} size={14} />
                      </span>
                      {b.category_name}
                    </span>
                    <span className="badge">{b.period === 'weekly' ? 'Semanal' : 'Mensual'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{money(b.spent, currency)}</span>
                    <span className="mute num" style={{ alignSelf: 'flex-end' }}>de {money(b.amount, currency)}</span>
                  </div>
                  <div className="bar-bg"><div className={`bar-fill ${cls}`} style={{ width: `${Math.min(100, p)}%` }} /></div>
                  <div className="mute" style={{ fontSize: 11.5, marginTop: 6 }}>
                    {p >= 100 ? 'Excedido' : `${money(b.remaining ?? b.amount - b.spent, currency)} disponible`} · {Math.round(p)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {open && <BudgetModal budget={editing} categories={categories} onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}
