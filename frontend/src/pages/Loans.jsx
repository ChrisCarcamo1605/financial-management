import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, fmtDate, isoDate } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

function LoanModal({ loan, sources, accounts, categories, onClose, onSaved }) {
  const { currency } = useTheme();
  const [form, setForm] = useState(loan ? { ...loan } : {
    name: '', principal: '', interest_rate: 0, interest_method: 'french',
    payment_type: 'monthly', installments: 12, payment_day: 1, start_date: isoDate(),
    income_source_id: '', category_id: '', account_id: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [confirmDelete, ConfirmUI] = useConfirm();
  const expenseCats = categories.filter((c) => c.type === 'expense');

  async function save() {
    if (!form.name || !form.principal || !form.income_source_id) { toast.error('Completa nombre, capital y fuente'); return; }
    setBusy(true);
    const payload = {
      name: form.name, principal: Number(form.principal), interest_rate: Number(form.interest_rate || 0),
      interest_method: form.interest_method, payment_type: form.payment_type,
      installments: form.payment_type !== 'single' ? Number(form.installments) : null,
      payment_day: form.payment_type === 'monthly' ? Number(form.payment_day) : null,
      start_date: form.start_date, income_source_id: Number(form.income_source_id),
      category_id: form.category_id ? Number(form.category_id) : null,
      account_id: form.account_id ? Number(form.account_id) : null,
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
    if (!await confirmDelete({ title: '¿Eliminar préstamo?', message: 'Se eliminará el calendario de pagos asociado.' })) return;
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
        <div className="field"><label>Tipo de pago</label><select value={form.payment_type} onChange={set('payment_type')}><option value="monthly">Mensual</option><option value="biweekly">Quincenal</option><option value="single">Único</option></select></div>
      </div>
      {form.payment_type !== 'single' && (
        <div className="field-row">
          <div className="field"><label>Cuotas</label><input type="number" value={form.installments} onChange={set('installments')} /></div>
          {form.payment_type === 'monthly' && (
            <div className="field"><label>Día de pago</label><input type="number" min="1" max="31" value={form.payment_day} onChange={set('payment_day')} /></div>
          )}
        </div>
      )}
      {form.payment_type !== 'single' && Number(form.principal) > 0 && Number(form.installments) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -4, marginBottom: 6, fontSize: 12, color: 'var(--t2)' }}>
          <span>Cuota {form.payment_type === 'monthly' ? 'mensual' : 'quincenal'} estimada (capital ÷ cuotas)</span>
          <span className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>{money(Number(form.principal) / Number(form.installments), currency)}</span>
        </div>
      )}
      <div className="field-row">
        <div className="field"><label>Inicio</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="field"><label>Fuente de ingreso</label><select value={form.income_source_id} onChange={set('income_source_id')}><option value="">Selecciona…</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Categoría de gasto</label>
          <select value={form.category_id} onChange={set('category_id')}>
            <option value="">Sin categoría</option>
            {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Cuenta de pago</label>
          <select value={form.account_id} onChange={set('account_id')}>
            <option value="">Sin cuenta</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      {(form.category_id || form.account_id) && (
        <div className="mute" style={{ fontSize: 11.5, marginTop: -4 }}>
          Al pagar una cuota se generará una transacción automáticamente
        </div>
      )}
      {ConfirmUI}
    </Modal>
  );
}

function AbonoModal({ loan, accounts, categories, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(isoDate());
  const [accountId, setAccountId] = useState(loan.account_id || '');
  const [categoryId, setCategoryId] = useState(loan.category_id || '');
  const [busy, setBusy] = useState(false);
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const needsAccount = !loan.account_id;
  const needsCategory = !loan.category_id;

  async function save() {
    if (!amount) { toast.error('Escribe un monto'); return; }
    if (!accountId || !categoryId) { toast.error('Selecciona cuenta y categoría'); return; }
    setBusy(true);
    try {
      await api.post('/api/transactions', {
        account_id: Number(accountId),
        category_id: Number(categoryId),
        amount: Number(amount),
        type: 'expense',
        date,
        description: `Abono extra · ${loan.name}`,
        loan_id: loan.id,
      });
      toast.success('Abono registrado');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Error'); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Abonar a ${loan.name}`} onClose={onClose} maxWidth={380} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Abonar'}</button>
      </>
    }>
      <div className="mute" style={{ fontSize: 11.5, marginBottom: 10 }}>
        El abono se aplica a las cuotas más próximas y adelanta el pago del préstamo.
      </div>
      <div className="field-row">
        <div className="field"><label>Monto</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
        <div className="field"><label>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      {(needsAccount || needsCategory) && (
        <div className="field-row">
          {needsAccount && (
            <div className="field">
              <label>Cuenta</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Selecciona…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          {needsCategory && (
            <div className="field">
              <label>Categoría</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Selecciona…</option>
                {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function LoanDetail({ loan, currency, onClose, onChanged, onAbonar }) {
  const payments = loan.payments || [];

  async function pay(p) {
    const newStatus = p.status === 'paid' ? 'pending' : 'paid';
    try {
      await api.patch(`/api/loans/loan-payments/${p.id}/pay`, { status: newStatus, paid_date: isoDate() });
      toast.success(newStatus === 'paid' ? `Cuota ${p.installment_number} pagada` : `Cuota ${p.installment_number} revertida`);
      onChanged();
    } catch (e) { toast.error(e?.response?.data?.message || 'No se pudo marcar'); }
  }

  const hasAutoTx = loan.account_id && loan.category_id;
  const advanceCount = payments.filter((p) => p.is_advance).length;

  return (
    <Modal title={loan.name} onClose={onClose} maxWidth={520} footer={
      <>
        {loan.status !== 'paid' && <button className="btn btn-soft push" onClick={onAbonar}>Abonar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
      </>
    }>
      {loan.category_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${loan.category_color || 'var(--accent)'} 16%, transparent)`, color: loan.category_color || 'var(--accent)', flexShrink: 0 }}>
            <Icon icon={loan.category_icon} size={13} />
          </span>
          <span style={{ fontSize: 12.5, color: loan.category_color || 'var(--accent)', fontWeight: 500 }}>{loan.category_name}</span>
          {loan.account_name && <span className="mute" style={{ fontSize: 12 }}>· {loan.account_name}</span>}
        </div>
      )}
      {loan.finished_early && (
        <div className="chip" style={{ color: 'var(--accent)', marginBottom: 10 }}>
          <span className="dot" style={{ background: 'var(--accent)' }} />
          Liquidado anticipadamente · {payments.filter((p) => p.status === 'paid').length} de {payments.length} cuotas, gracias a abonos
        </div>
      )}
      <div className="g3" style={{ gap: 10 }}>
        <div className="preview-box"><div className="stat-lbl">Total</div><div className="num" style={{ fontWeight: 700 }}>{money(loan.total_amount, currency)}</div></div>
        <div className="preview-box"><div className="stat-lbl">Pagado</div><div className="num pos" style={{ fontWeight: 700 }}>{money(loan.total_paid, currency)}</div></div>
        <div className="preview-box"><div className="stat-lbl">Resta</div><div className="num neg" style={{ fontWeight: 700 }}>{money(loan.remaining, currency)}</div></div>
      </div>
      {hasAutoTx && (
        <div className="mute" style={{ fontSize: 11.5, margin: '8px 0 0' }}>
          Pagar genera una transacción en <strong>{loan.account_name}</strong>
        </div>
      )}
      {!loan.finished_early && advanceCount > 0 && (
        <div className="mute" style={{ fontSize: 11.5, margin: '8px 0 0' }}>
          {advanceCount} cuota{advanceCount > 1 ? 's' : ''} adelantada{advanceCount > 1 ? 's' : ''} por abonos extra
        </div>
      )}
      <div className="tbl-wrap" style={{ marginTop: 8 }}>
        <table>
          <thead><tr><th>#</th><th>Vence</th><th style={{ textAlign: 'right' }}>Cuota</th><th></th></tr></thead>
          <tbody>
            {payments.map((p) => {
              const hasPartialAbono = p.status === 'pending' && Number(p.paid_amount) > 0;
              return (
                <tr key={p.id}>
                  <td className="mute">{p.installment_number}</td>
                  <td className="mute">{fmtDate(p.due_date)}</td>
                  <td className="amt">{money(p.amount, currency)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.status === 'paid' ? (
                      <span
                        className="chip"
                        style={{ color: 'var(--accent)', cursor: 'pointer' }}
                        title={p.is_advance ? 'Pagada antes de su fecha por un abono extra' : undefined}
                        onClick={() => pay(p)}
                      >
                        <span className="dot" style={{ background: 'var(--accent)' }} />
                        {p.is_advance ? 'Adelantada' : 'Pagada'}
                      </span>
                    ) : hasPartialAbono ? (
                      <span className="chip" style={{ color: 'var(--amber)' }} title="Abonado por adelantado; el resto se cubre con las siguientes cuotas o un nuevo abono">
                        <span className="dot" style={{ background: 'var(--amber)' }} />
                        Abonado {money(p.paid_amount, currency)} de {money(p.amount, currency)}
                      </span>
                    ) : (
                      <button className="btn btn-soft" style={{ padding: '4px 10px' }} onClick={() => pay(p)}>Pagar</button>
                    )}
                  </td>
                </tr>
              );
            })}
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
  const [detailId, setDetailId] = useState(null);
  const [abono, setAbono] = useState(null);

  const q = useFetch('/api/loans', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const sourcesQ = useFetch('/api/income-sources', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const accountsQ = useFetch('/api/accounts', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const categoriesQ = useFetch('/api/categories', { params: { per_page: 200 }, select: (d) => d.data || d.items || d });

  const loans = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const sources = useMemo(() => (Array.isArray(sourcesQ.data) ? sourcesQ.data : []), [sourcesQ.data]);
  const accounts = useMemo(() => (Array.isArray(accountsQ.data) ? accountsQ.data : []), [accountsQ.data]);
  const categories = useMemo(() => (Array.isArray(categoriesQ.data) ? categoriesQ.data : []), [categoriesQ.data]);

  // Loan derivado en vivo: cuando q.data se actualiza, detailLoan también
  const detailLoan = useMemo(() => detailId ? loans.find((l) => l.id === detailId) || null : null, [detailId, loans]);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }
  function onChanged() { q.refetch(); }
  function onAbonoSaved() { setAbono(null); q.refetch(); }

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
                <div key={l.id} className="panel panel-pad" style={{ cursor: 'pointer' }} onClick={() => setDetailId(l.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                      {l.category_icon ? (
                        <span style={{ width: 28, height: 28, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${l.category_color || 'var(--accent)'} 16%, transparent)`, color: l.category_color || 'var(--accent)', flexShrink: 0 }}>
                          <Icon icon={l.category_icon} size={14} />
                        </span>
                      ) : null}
                      {l.name}
                    </span>
                    <span className="chip" style={{ color: l.status === 'paid' ? 'var(--accent)' : 'var(--amber)' }}>{l.status === 'paid' ? (l.finished_early ? 'Pagado anticipado' : 'Pagado') : 'Activo'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{money(l.remaining, currency)}</span>
                    <span className="mute num" style={{ alignSelf: 'flex-end' }}>de {money(l.total_amount, currency)}</span>
                  </div>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.min(100, p)}%` }} /></div>
                  <div className="mute" style={{ fontSize: 11.5, marginTop: 6 }}>
                    {l.interest_method === 'french' ? 'Francés' : 'Simple'} · {l.interest_rate}% · {(l.payments || []).length} cuotas
                    <span className="panel-link" style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); setEditing(l); setOpen(true); }}>Editar</span>
                    {l.status !== 'paid' && <span className="panel-link" style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); setAbono(l); }}>Abonar</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {open && <LoanModal loan={editing} sources={sources} accounts={accounts} categories={categories} onClose={() => setOpen(false)} onSaved={onSaved} />}
      {detailLoan && <LoanDetail loan={detailLoan} currency={currency} onClose={() => setDetailId(null)} onChanged={onChanged} onAbonar={() => setAbono(detailLoan)} />}
      {abono && <AbonoModal loan={abono} accounts={accounts} categories={categories} onClose={() => setAbono(null)} onSaved={onAbonoSaved} />}
    </>
  );
}
