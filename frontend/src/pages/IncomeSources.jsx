import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money } from '../lib/format';

const MODALITIES = [
  { v: 'planilla', l: 'Planilla' },
  { v: 'servicios_profesionales', l: 'Servicios prof.' },
  { v: 'pension', l: 'Pensión' },
];
const SCHEDULES = [
  { v: 'monthly', l: 'Mensual' },
  { v: 'biweekly', l: 'Quincenal' },
];

function IncomeModal({ source, onClose, onSaved }) {
  const { currency: defCur } = useTheme();
  const [form, setForm] = useState(source ? { ...source } : { name: '', modality: 'planilla', gross_amount: '', pay_schedule: 'monthly', pay_day: 30, currency: defCur || 'USD' });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // live net preview when gross / modality change
  useEffect(() => {
    if (!form.gross_amount) { setPreview(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.post('/api/income-sources/preview', { gross_amount: Number(form.gross_amount), modality: form.modality });
        setPreview(data);
      } catch { setPreview(null); }
    }, 350);
    return () => clearTimeout(t);
  }, [form.gross_amount, form.modality]);

  async function save() {
    if (!form.name || !form.gross_amount) { toast.error('Escribe nombre y monto bruto'); return; }
    setBusy(true);
    const payload = { name: form.name, modality: form.modality, gross_amount: Number(form.gross_amount), pay_schedule: form.pay_schedule, pay_day: Number(form.pay_day) || null, currency: form.currency };
    try {
      if (source?.id) await api.put(`/api/income-sources/${source.id}`, payload);
      else await api.post('/api/income-sources', payload);
      toast.success(source ? 'Fuente actualizada' : 'Fuente creada');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm('¿Eliminar fuente de ingreso?')) return;
    try { await api.delete(`/api/income-sources/${source.id}`); toast.success('Eliminada'); onSaved(); }
    catch (e) { toast.error(e?.response?.data?.message || 'No se pudo eliminar'); }
  }

  return (
    <Modal title={source ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'} onClose={onClose} footer={
      <>
        {source?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field"><label>Nombre</label><input value={form.name} onChange={set('name')} placeholder="Salario Principal" /></div>
      <div className="field-row">
        <div className="field"><label>Modalidad</label><select value={form.modality} onChange={set('modality')}>{MODALITIES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
        <div className="field"><label>Monto bruto</label><input type="number" step="0.01" value={form.gross_amount} onChange={set('gross_amount')} placeholder="0.00" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Frecuencia</label><select value={form.pay_schedule} onChange={set('pay_schedule')}>{SCHEDULES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
        <div className="field"><label>Día de pago</label><input type="number" min="1" max="31" value={form.pay_day || ''} onChange={set('pay_day')} /></div>
      </div>
      {preview && (
        <div className="preview-box">
          <div className="pb-row"><span className="lbl">Bruto</span><span className="val num">{money(preview.gross ?? form.gross_amount, form.currency)}</span></div>
          <div className="pb-row"><span className="lbl">ISSS · AFP · ISR</span><span className="val num" style={{ color: 'var(--red)' }}>−{money((Number(preview.isss || 0) + Number(preview.afp || 0) + Number(preview.isr || 0)), form.currency)}</span></div>
          <div className="pb-row total"><span className="lbl">Neto</span><span className="val num">{money(preview.net ?? preview.net_amount, form.currency)}</span></div>
        </div>
      )}
    </Modal>
  );
}

export default function IncomeSources() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const q = useFetch('/api/income-sources', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const sources = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }

  return (
    <>
      <PageHeader title="Fuentes de Ingreso">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon /> Nueva fuente</button>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : sources.length === 0 ? (
          <EmptyState title="Sin fuentes de ingreso" sub="Registra tu salario u otras fuentes" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><PlusIcon /> Nueva fuente</button>} />
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Modalidad</th><th>Frecuencia</th><th style={{ textAlign: 'right' }}>Bruto</th><th style={{ textAlign: 'right' }}>Neto</th></tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => { setEditing(s); setOpen(true); }}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td><span className="chip">{MODALITIES.find((m) => m.v === s.modality)?.l || s.modality}</span></td>
                    <td className="mute">{s.pay_schedule === 'biweekly' ? 'Quincenal' : 'Mensual'}{s.pay_day ? ` · día ${s.pay_day}` : ''}</td>
                    <td className="amt mute">{money(s.gross_amount, s.currency || currency)}</td>
                    <td className="amt pos">{money(s.net_amount, s.currency || currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <IncomeModal source={editing} onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}
