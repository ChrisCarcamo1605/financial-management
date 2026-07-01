import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, fmtDate } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

const WEEKDAYS = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' }, { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' }, { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' }, { value: 7, label: 'Domingo' },
];
const PERIOD_LABELS = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };

function BudgetModal({ budget, categories, onClose, onSaved }) {
  const [form, setForm] = useState(budget ? {
    ...budget,
    start_day: budget.start_day ?? (budget.period === 'weekly' ? new Date(budget.start_date).getDay() || 7 : new Date(budget.start_date).getDate()),
    end_date: budget.end_date || '',
  } : { category_id: '', amount: '', period: 'monthly', start_day: 1, end_date: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const [confirmDelete, ConfirmUI] = useConfirm();
  const isBiweekly = form.period === 'biweekly';

  async function save() {
    if (!form.category_id || !form.amount) { toast.error('Elige categoría y monto'); return; }
    setBusy(true);
    const payload = {
      category_id: Number(form.category_id),
      amount: Number(form.amount),
      period: form.period,
      start_day: isBiweekly ? null : Number(form.start_day),
      end_date: form.end_date || null,
    };
    try {
      if (budget?.id) await api.put(`/api/budgets/${budget.id}`, payload);
      else await api.post('/api/budgets', payload);
      toast.success(budget ? 'Presupuesto actualizado' : 'Presupuesto creado');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.error || 'Error al guardar'); }
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
        <div className="field">
          <label>Periodo</label>
          <select value={form.period} onChange={set('period')}>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
      </div>
      {!isBiweekly ? (
        <div className="field">
          <label>{form.period === 'weekly' ? 'Día que inicia la semana' : 'Día que inicia el mes'}</label>
          {form.period === 'weekly' ? (
            <select value={form.start_day} onChange={set('start_day')}>
              {WEEKDAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          ) : (
            <input type="number" min="1" max="31" value={form.start_day} onChange={set('start_day')} />
          )}
        </div>
      ) : (
        <div className="mute" style={{ fontSize: 11.5, marginTop: -4 }}>
          Quincenal usa los mismos periodos que el resto de la app: 1–14/15 y 15/16–fin de mes.
        </div>
      )}
      <div className="field">
        <label>Fecha final (opcional)</label>
        <input type="date" value={form.end_date} onChange={set('end_date')} />
        <div className="mute" style={{ fontSize: 11.5, marginTop: 4 }}>
          Sin fecha final, el presupuesto se reinicia solo cada {PERIOD_LABELS[form.period].toLowerCase()}.
        </div>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {b.active === false && <span className="chip" style={{ color: 'var(--t3)' }}>Vencido</span>}
                      <span className="badge">{PERIOD_LABELS[b.period] || b.period}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{money(b.spent, currency)}</span>
                    <span className="mute num" style={{ alignSelf: 'flex-end' }}>de {money(b.amount, currency)}</span>
                  </div>
                  <div className="bar-bg"><div className={`bar-fill ${cls}`} style={{ width: `${Math.min(100, p)}%` }} /></div>
                  <div className="mute" style={{ fontSize: 11.5, marginTop: 6 }}>
                    {p >= 100 ? 'Excedido' : `${money(b.remaining ?? b.amount - b.spent, currency)} disponible`} · {Math.round(p)}%
                  </div>
                  {b.cycle_start && (
                    <div className="mute" style={{ fontSize: 11, marginTop: 4 }}>
                      {fmtDate(b.cycle_start, 'd MMM')} – {fmtDate(b.cycle_end, 'd MMM')}
                    </div>
                  )}
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
