import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

const CURRENCIES = ['USD', 'MXN', 'EUR'];

function AccountModal({ acc, onClose, onSaved }) {
  const [form, setForm] = useState(acc ? { ...acc } : { name: '', balance: '', currency: 'USD' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [confirmDelete, ConfirmUI] = useConfirm();

  async function save() {
    if (!form.name) { toast.error('Escribe un nombre'); return; }
    setBusy(true);
    const payload = { name: form.name, balance: Number(form.balance || 0), currency: form.currency };
    try {
      if (acc?.id) await api.put(`/api/accounts/${acc.id}`, payload);
      else await api.post('/api/accounts', payload);
      toast.success(acc ? 'Cuenta actualizada' : 'Cuenta creada');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar'); }
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
      <div className="field-row">
        <div className="field"><label>Saldo</label><input type="number" step="0.01" value={form.balance} onChange={set('balance')} placeholder="0.00" /></div>
        <div className="field"><label>Moneda</label><select value={form.currency} onChange={set('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      {ConfirmUI}
    </Modal>
  );
}

export default function Accounts() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const q = useFetch('/api/accounts', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const accounts = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }

  return (
    <>
      <PageHeader title="Cuentas">
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
              {accounts.map((a) => (
                <div key={a.id} className="panel panel-pad" style={{ cursor: 'pointer' }} onClick={() => { setEditing(a); setOpen(true); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</span>
                    <span className="badge">{a.currency}</span>
                  </div>
                  <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: Number(a.balance) >= 0 ? 'var(--text)' : 'var(--red)' }}>{money(a.balance, a.currency)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {open && <AccountModal acc={editing} onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}
