import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, fmtDate, isoDate } from '../lib/format';

function LoanModal({ loan, sources, onClose, onSaved }) {
  const [form, setForm] = useState(loan ? { ...loan } : {
    name: '', principal: '', interest_rate: 0, interest_method: 'french',
    payment_type: 'monthly', installments: 12, payment_day: 1, start_date: isoDate(), income_source_id: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name || !form.principal || !form.income_source_id) { toast.error('Completa nombre, capital y fuente'); return; }
    setBusy(true);
    const payload = {
      name: form.name, principal: Number(form.principal), interest_rate: Number(form.interest_rate || 0),
      interest_method: form.interest_method, payment_type: form.payment_type,
      installments: form.payment_type === 'monthly' ? Number(form.installments) : null,
      payment_day: form.payment_type === 'monthly' ? Number(form.payment_day) : null,
      start_date: form.start_date, income_source_id: Number(form.income_source_id),
    };
    try {
      if (loan?.id) await api.put(`/api/loans/${loan.id}`, payload);
      else await api.post('/api/loans', payload);
      toast.success(loan ? 'Préstamo actualizado' : 'Préstamo creado');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm('¿Eliminar préstamo?')) return;
    try { await api.delete(`/api/loans/${loan.id}`); toast.success('Eliminado'); onSaved(); }
    catch { toast.error('No se pudo eliminar'); }
  }

  return (
    <Modal title={loan ? 'Editar préstamo' : 'Nuevo préstamo'} onClose={onClose} footer={
      <>
        {loan?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field"><label>Nombre</label><input value={form.name} onChange={set('name')} placeholder="Préstamo auto" /></div>
      <div className="field-row">
        <div className="field"><label>Capital</label><input type="number" step="0.01" value={form.principal} onChange={set('principal')} /></div>
        <div className="field"><label>Tasa %</label><input type="number" step="0.01" value={form.interest_rate} onChange={set('interest_rate')} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Método</label><select value={form.interest_method} onChange={set('interest_method')}><option value="french">Francés</option><option value="simple">Simple</option></select></div>
        <div className="field"><label>Tipo de pago</label><select value={form.payment_type} onChange={set('payment_type')}><option value="monthly">Mensual</option><option value="single">Único</option></select></div>
      </div>
      {form.payment_type === 'monthly' && (
        <div className="field-row">
          <div className="field"><label>Cuotas</label><input type="number" value={form.installments} onChange={set('installments')} /></div>
          <div className="field"><label>Día de pago</label><input type="number" min="1" max="31" value={form.payment_day} onChange={set('payment_day')} /></div>
        </div>
      )}
      <div className="field-row">
        <div className="field"><label>Inicio</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="field"><label>Fuente de ingreso</label><select value={form.income_source_id} onChange={set('income_source_id')}><option value="">Selecciona…</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      </div>
    </Modal>
  );
}

function LoanDetail({ loan, currency, onClose, onChanged }) {
  const payments = loan.payments || [];
  async function pay(p) {
    try {
      await api.patch(`/api/loans/loan-payments/${p.id}/pay`, { status: 'paid', paid_date: isoDate() });
      toast.success(`Cuota ${p.installment_number} pagada`);
      onChanged();
    } catch { toast.error('No se pudo marcar'); }
  }
  return (
    <Modal title={loan.name} onClose={onClose} maxWidth={520} footer={<button className="btn btn-ghost" onClick={onClose}>Cerrar</button>}>
      <div className="field-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="preview-box"><div className="stat-lbl">Total</div><div className="num" style={{ fontWeight: 700 }}>{money(loan.total_amount, currency)}</div></div>
        <div className="preview-box"><div className="stat-lbl">Pagado</div><div className="num pos" style={{ fontWeight: 700 }}>{money(loan.total_paid, currency)}</div></div>
        <div className="preview-box"><div className="stat-lbl">Resta</div><div className="num neg" style={{ fontWeight: 700 }}>{money(loan.remaining, currency)}</div></div>
      </div>
      <div className="tbl-wrap" style={{ marginTop: 4 }}>
        <table>
          <thead><tr><th>#</th><th>Vence</th><th style={{ textAlign: 'right' }}>Cuota</th><th></th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="mute">{p.installment_number}</td>
                <td className="mute">{fmtDate(p.due_date)}</td>
                <td className="amt">{money(p.amount, currency)}</td>
                <td style={{ textAlign: 'right' }}>
                  {p.status === 'paid'
                    ? <span className="chip" style={{ color: 'var(--accent)' }}><span className="dot" style={{ background: 'var(--accent)' }} />Pagada</span>
                    : <button className="btn btn-soft" style={{ padding: '4px 10px' }} onClick={() => pay(p)}>Pagar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function Loans() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const q = useFetch('/api/loans', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const sourcesQ = useFetch('/api/income-sources', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const loans = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const sources = useMemo(() => (Array.isArray(sourcesQ.data) ? sourcesQ.data : []), [sourcesQ.data]);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }
  function onChanged() { q.refetch().then(() => setDetail((d) => d && loans.find((l) => l.id === d.id))); }

  return (
    <>
      <PageHeader title="Préstamos">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon /> Nuevo préstamo</button>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : loans.length === 0 ? (
          <EmptyState title="Sin préstamos" sub="Registra un préstamo y su calendario de pagos" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><PlusIcon /> Nuevo préstamo</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
            {loans.map((l) => {
              const p = Number(l.total_amount) ? (Number(l.total_paid) / Number(l.total_amount)) * 100 : 0;
              return (
                <div key={l.id} className="panel panel-pad" style={{ cursor: 'pointer' }} onClick={() => setDetail(l)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{l.name}</span>
                    <span className="chip" style={{ color: l.status === 'paid' ? 'var(--accent)' : 'var(--amber)' }}>{l.status === 'paid' ? 'Pagado' : 'Activo'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{money(l.remaining, currency)}</span>
                    <span className="mute num" style={{ alignSelf: 'flex-end' }}>de {money(l.total_amount, currency)}</span>
                  </div>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.min(100, p)}%` }} /></div>
                  <div className="mute" style={{ fontSize: 11.5, marginTop: 6 }}>{l.interest_method === 'french' ? 'Francés' : 'Simple'} · {l.interest_rate}% · {(l.payments || []).length} cuotas
                    <span className="panel-link" style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); setEditing(l); setOpen(true); }}>Editar</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {open && <LoanModal loan={editing} sources={sources} onClose={() => setOpen(false)} onSaved={onSaved} />}
      {detail && <LoanDetail loan={detail} currency={currency} onClose={() => setDetail(null)} onChanged={onChanged} />}
    </>
  );
}
