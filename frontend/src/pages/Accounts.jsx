import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, fmtDate, isoDate } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

const CURRENCIES = ['USD', 'MXN', 'EUR'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function IconCard() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 6h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function emptyAccount() {
  return { name: '', balance: '', currency: 'USD', type: 'normal', credit_limit: '', cutoff_day: '1', payment_due_day: '15', start_date: isoDate() };
}

function AccountModal({ acc, onClose, onSaved }) {
  const [form, setForm] = useState(acc ? { ...acc } : emptyAccount());
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [confirmDelete, ConfirmUI] = useConfirm();
  const isCard = form.type === 'tarjeta_credito';

  async function save() {
    if (!form.name) { toast.error('Escribe un nombre'); return; }
    if (isCard && (!form.credit_limit || !form.cutoff_day || !form.payment_due_day)) {
      toast.error('Completa disponible, día de corte y día límite de pago');
      return;
    }
    setBusy(true);
    const payload = isCard
      ? {
          name: form.name,
          currency: form.currency,
          type: form.type,
          credit_limit: Number(form.credit_limit),
          cutoff_day: Number(form.cutoff_day),
          payment_due_day: Number(form.payment_due_day),
          start_date: form.start_date || null,
        }
      : { name: form.name, balance: Number(form.balance || 0), currency: form.currency, type: 'normal' };
    try {
      if (acc?.id) await api.put(`/api/accounts/${acc.id}`, payload);
      else await api.post('/api/accounts', payload);
      toast.success(acc ? 'Cuenta actualizada' : 'Cuenta creada');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.error || 'Error al guardar'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!await confirmDelete({ title: '¿Eliminar cuenta?', message: 'Se eliminarán también todas sus transacciones.' })) return;
    try { await api.delete(`/api/accounts/${acc.id}`); toast.success('Cuenta eliminada'); onSaved(); }
    catch (e) { toast.error('No se pudo eliminar'); }
  }

  return (
    <Modal title={acc ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose} footer={
      <>
        {acc?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field"><label>Nombre</label><input value={form.name} onChange={set('name')} placeholder="BBVA Principal" /></div>
      <div className="field">
        <label>Tipo</label>
        <div className="seg-toggle">
          <button className={!isCard ? 'on-inc' : ''} onClick={() => setForm((f) => ({ ...f, type: 'normal' }))}>Normal</button>
          <button className={isCard ? 'on-exp' : ''} onClick={() => setForm((f) => ({ ...f, type: 'tarjeta_credito' }))}>Tarjeta de crédito</button>
        </div>
      </div>
      {isCard ? (
        <>
          <div className="field-row">
            <div className="field"><label>Disponible</label><input type="number" step="0.01" value={form.credit_limit} onChange={set('credit_limit')} placeholder="0.00" /></div>
            <div className="field"><label>Moneda</label><select value={form.currency} onChange={set('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Día de corte</label>
              <select value={form.cutoff_day} onChange={set('cutoff_day')}>{DAYS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            </div>
            <div className="field">
              <label>Día límite de pago</label>
              <select value={form.payment_due_day} onChange={set('payment_due_day')}>{DAYS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            </div>
          </div>
          <div className="field">
            <label>Fecha de inicio</label>
            <input type="date" value={form.start_date || ''} onChange={set('start_date')} />
            <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 4 }}>
              Desde cuándo tienes la tarjeta. Las quincenas anteriores a esta fecha la ignoran.
            </div>
          </div>
        </>
      ) : (
        <div className="field-row">
          <div className="field"><label>Saldo</label><input type="number" step="0.01" value={form.balance} onChange={set('balance')} placeholder="0.00" /></div>
          <div className="field"><label>Moneda</label><select value={form.currency} onChange={set('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
      )}
      {ConfirmUI}
    </Modal>
  );
}

function TransferModal({ accounts, onClose, onSaved }) {
  const [form, setForm] = useState({ from_account_id: '', to_account_id: '', amount: '', date: isoDate(), description: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.from_account_id || !form.to_account_id || !form.amount) {
      toast.error('Completa origen, destino y monto');
      return;
    }
    if (form.from_account_id === form.to_account_id) {
      toast.error('Origen y destino deben ser distintos');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/transfers', {
        from_account_id: Number(form.from_account_id),
        to_account_id: Number(form.to_account_id),
        amount: Number(form.amount),
        date: form.date,
        description: form.description,
      });
      toast.success('Transferencia realizada');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.error || 'Error al transferir'); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Nueva transferencia" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Transfiriendo…' : 'Transferir'}</button>
      </>
    }>
      <div className="field-row">
        <div className="field">
          <label>Desde</label>
          <select value={form.from_account_id} onChange={set('from_account_id')}>
            <option value="">Selecciona…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'tarjeta_credito' ? `💳 ${a.name}` : a.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Hacia</label>
          <select value={form.to_account_id} onChange={set('to_account_id')}>
            <option value="">Selecciona…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'tarjeta_credito' ? `💳 ${a.name}` : a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Monto</label><input type="number" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" /></div>
        <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={set('date')} /></div>
      </div>
      <div className="field"><label>Descripción</label><input value={form.description} onChange={set('description')} placeholder="Opcional" /></div>
    </Modal>
  );
}

function TransferRow({ t, currency, onDeleted }) {
  const [confirmDelete, ConfirmUI] = useConfirm();
  async function remove() {
    if (!await confirmDelete({ title: '¿Eliminar transferencia?', message: 'Se revertirá el balance de ambas cuentas.' })) return;
    try { await api.delete(`/api/transfers/${t.id}`); toast.success('Transferencia eliminada'); onDeleted(); }
    catch (e) { toast.error('No se pudo eliminar'); }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 7 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.from_account_name} → {t.to_account_name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>{fmtDate(t.date)}{t.description ? ` · ${t.description}` : ''}</div>
      </div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{money(t.amount, currency)}</div>
      <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={remove}>Eliminar</button>
      {ConfirmUI}
    </div>
  );
}

export default function Accounts() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const q = useFetch('/api/accounts', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const accounts = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const total = accounts.filter((a) => a.type !== 'tarjeta_credito').reduce((s, a) => s + Number(a.balance || 0), 0);

  const transfersQ = useFetch('/api/transfers', { params: { per_page: 10 }, select: (d) => d.data || d });
  const transfers = useMemo(() => (Array.isArray(transfersQ.data) ? transfersQ.data : []), [transfersQ.data]);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }
  function onTransferSaved() { setTransferOpen(false); q.refetch(); transfersQ.refetch(); }
  function onTransferDeleted() { q.refetch(); transfersQ.refetch(); }

  return (
    <>
      <PageHeader title="Cuentas">
        <button className="btn btn-ghost" onClick={() => setTransferOpen(true)} disabled={accounts.length < 2}>Transferir</button>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon /> Nueva cuenta</button>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : accounts.length === 0 ? (
          <EmptyState title="Sin cuentas" sub="Crea tu primera cuenta" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><PlusIcon /> Nueva cuenta</button>} />
        ) : (
          <>
            <div className="stats g3">
              <div className="stat"><div className="stat-lbl">Balance total</div><div className="stat-val pos num">{money(total, currency)}</div><div className="stat-delta">{accounts.length} cuentas</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {accounts.map((a) => {
                const isCard = a.type === 'tarjeta_credito';
                return (
                  <div key={a.id} className="panel panel-pad" style={{ cursor: 'pointer' }} onClick={() => { setEditing(a); setOpen(true); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isCard && <IconCard />}
                        {a.name}
                      </span>
                      <span className="badge">{a.currency}</span>
                    </div>
                    {isCard ? (
                      <>
                        <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: Number(a.available) >= 0 ? 'var(--text)' : 'var(--red)' }}>
                          {money(a.available, a.currency)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                          Disponible de {money(a.credit_limit, a.currency)} · Corte día {a.cutoff_day} · Pagar antes del {a.payment_due_day}
                        </div>
                        {a.start_date && (
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                            Desde {fmtDate(a.start_date)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: Number(a.balance) >= 0 ? 'var(--text)' : 'var(--red)' }}>{money(a.balance, a.currency)}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {transfers.length > 0 && (
              <div className="panel" style={{ marginTop: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600 }}>
                  Transferencias recientes
                </div>
                <div style={{ padding: 8 }}>
                  {transfers.map((t) => <TransferRow key={t.id} t={t} currency={currency} onDeleted={onTransferDeleted} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {open && <AccountModal acc={editing} onClose={() => setOpen(false)} onSaved={onSaved} />}
      {transferOpen && <TransferModal accounts={accounts} onClose={() => setTransferOpen(false)} onSaved={onTransferSaved} />}
    </>
  );
}
