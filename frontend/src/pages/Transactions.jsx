import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import useConfirm from '../hooks/useConfirm';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money, signedMoney, fmtDate, isoDate } from '../lib/format';

const empty = { type: 'expense', amount: '', description: '', date: isoDate(), account_id: '', category_id: '' };

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span style={{ opacity: 0.3, fontSize: 10, marginLeft: 3 }}>↕</span>;
  return <span style={{ fontSize: 10, marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function TxModal({ tx, accounts, categories, onClose, onSaved }) {
  const [form, setForm] = useState(tx ? { ...tx } : empty);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, ConfirmUI] = useConfirm();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cats = categories.filter((c) => c.type === form.type);

  async function save() {
    if (!form.account_id || !form.category_id || !form.amount) {
      toast.error('Completa cuenta, categoría y monto');
      return;
    }
    setBusy(true);
    const payload = {
      type: form.type,
      amount: Number(form.amount),
      description: form.description,
      date: form.date,
      account_id: Number(form.account_id),
      category_id: Number(form.category_id),
    };
    try {
      if (tx?.id) await api.put(`/api/transactions/${tx.id}`, payload);
      else await api.post('/api/transactions', payload);
      toast.success(tx ? 'Transacción actualizada' : 'Transacción creada');
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tx ? 'Editar transacción' : 'Nueva transacción'}
      onClose={onClose}
      footer={
        <>
          {tx?.id && (
            <button className="btn btn-danger push" onClick={async () => {
              if (!await confirmDelete({ title: '¿Eliminar transacción?', message: 'Esta acción no se puede deshacer.' })) return;
              try { await api.delete(`/api/transactions/${tx.id}`); toast.success('Eliminada'); onSaved(); }
              catch (e) { toast.error('No se pudo eliminar'); }
            }}>Eliminar</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </>
      }
    >
      <div className="field">
        <label>Tipo</label>
        <div className="seg-toggle">
          <button className={form.type === 'income' ? 'on-inc' : ''} onClick={() => setForm((f) => ({ ...f, type: 'income', category_id: '' }))}>Ingreso</button>
          <button className={form.type === 'expense' ? 'on-exp' : ''} onClick={() => setForm((f) => ({ ...f, type: 'expense', category_id: '' }))}>Gasto</button>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Monto</label><input type="number" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" /></div>
        <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={set('date')} /></div>
      </div>
      <div className="field"><label>Descripción</label><input value={form.description} onChange={set('description')} placeholder="Opcional" /></div>
      <div className="field-row">
        <div className="field">
          <label>Cuenta</label>
          <select value={form.account_id} onChange={set('account_id')}>
            <option value="">Selecciona…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'tarjeta_credito' ? `💳 ${a.name}` : a.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Categoría</label>
          <select value={form.category_id} onChange={set('category_id')}>
            <option value="">Selecciona…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {ConfirmUI}
    </Modal>
  );
}

export default function Transactions() {
  const location = useLocation();
  const { currency } = useTheme();
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const accountsQ = useFetch('/api/accounts', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const categoriesQ = useFetch('/api/categories', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const txQ = useFetch('/api/transactions', { params: { limit: 100, ...(filterType && { type: filterType }) }, select: (d) => d.data || d });

  const accounts = useMemo(() => (Array.isArray(accountsQ.data) ? accountsQ.data : []), [accountsQ.data]);
  const categories = useMemo(() => (Array.isArray(categoriesQ.data) ? categoriesQ.data : []), [categoriesQ.data]);
  const txs = useMemo(() => (Array.isArray(txQ.data) ? txQ.data : []), [txQ.data]);

  useEffect(() => {
    if (location.state?.openNew) {
      setEditing(null);
      setOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTxs = useMemo(() => {
    let result = txs;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.category_name || '').toLowerCase().includes(q) ||
        (t.account_name || '').toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'amount':      av = Number(a.amount);     bv = Number(b.amount);     break;
        case 'description': av = a.description || '';  bv = b.description || '';  break;
        case 'category':    av = a.category_name || ''; bv = b.category_name || ''; break;
        case 'account':     av = a.account_name || ''; bv = b.account_name || ''; break;
        default:            av = a.date || '';          bv = b.date || '';         break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [txs, search, sortField, sortDir]);

  const totals = useMemo(() => {
    let inc = 0, exp = 0;
    filteredTxs.forEach((t) => (t.type === 'income' ? (inc += Number(t.amount)) : (exp += Number(t.amount))));
    return { inc, exp };
  }, [filteredTxs]);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(t) { setEditing(t); setOpen(true); }
  function onSaved() { setOpen(false); setEditing(null); txQ.refetch(); }

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  return (
    <>
      <PageHeader title="Transacciones">
        <div className="seg">
          <button className={!filterType ? 'on' : ''} onClick={() => setFilterType('')}>Todas</button>
          <button className={filterType === 'income' ? 'on' : ''} onClick={() => setFilterType('income')}>Ingresos</button>
          <button className={filterType === 'expense' ? 'on' : ''} onClick={() => setFilterType('expense')}>Gastos</button>
        </div>
        <button className="btn btn-primary" onClick={openNew}><PlusIcon /> Nueva</button>
      </PageHeader>

      <div className="content">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--t3)', pointerEvents: 'none' }}>
              <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5l3 3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descripción, categoría, cuenta…"
              style={{ width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
            />
          </div>
          {!txQ.loading && txs.length > 0 && (
            <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--t3)', alignItems: 'center', flexShrink: 0 }}>
              {filteredTxs.length}{filteredTxs.length !== txs.length && `/${txs.length}`} transacciones
              <span style={{ color: 'var(--b2)' }}>·</span>
              <span className="pos num" style={{ fontWeight: 600 }}>+{money(totals.inc, currency)}</span>
              <span style={{ color: 'var(--b2)' }}>·</span>
              <span className="neg num" style={{ fontWeight: 600 }}>−{money(totals.exp, currency)}</span>
            </div>
          )}
        </div>

        {txQ.loading ? <Loading /> : txQ.error ? <ErrorState error={txQ.error} onRetry={txQ.refetch} /> : txs.length === 0 ? (
          <EmptyState title="Sin transacciones" sub="Registra tu primera transacción" action={<button className="btn btn-primary" onClick={openNew}><PlusIcon /> Nueva transacción</button>} />
        ) : filteredTxs.length === 0 ? (
          <div className="empty"><div className="empty-sub">Sin resultados para "{search}"</div></div>
        ) : (
          <div className="tbl-wrap tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => toggleSort('description')}>Descripción <SortIcon field="description" sortField={sortField} sortDir={sortDir} /></th>
                  <th style={thStyle} onClick={() => toggleSort('category')}>Categoría <SortIcon field="category" sortField={sortField} sortDir={sortDir} /></th>
                  <th style={thStyle} onClick={() => toggleSort('account')}>Cuenta <SortIcon field="account" sortField={sortField} sortDir={sortDir} /></th>
                  <th style={thStyle} onClick={() => toggleSort('date')}>Fecha <SortIcon field="date" sortField={sortField} sortDir={sortDir} /></th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('amount')}>Monto <SortIcon field="amount" sortField={sortField} sortDir={sortDir} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((t) => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(t)}>
                    <td>{t.description || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `color-mix(in srgb, ${t.category_color || 'var(--accent)'} 14%, transparent)`, color: t.category_color || 'var(--accent)', borderRadius: 6, padding: '2px 7px', fontSize: 12, fontWeight: 500 }}>
                        <Icon icon={t.category_icon} size={12} />
                        {t.category_name}
                      </span>
                    </td>
                    <td className="mute">{t.account_name}</td>
                    <td className="mute">{fmtDate(t.date)}</td>
                    <td className={`amt ${t.type === 'income' ? 'pos' : 'neg'}`}>{signedMoney(t.amount, t.type, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <TxModal tx={editing} accounts={accounts} categories={categories} onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}
