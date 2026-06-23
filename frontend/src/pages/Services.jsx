import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorState, EmptyState } from '../components/State';
import Icon from '../components/Icon';
import IconPicker from '../components/IconPicker';
import { useFetch } from '../hooks/useFetch';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { money } from '../lib/format';
import useConfirm from '../hooks/useConfirm';

const SURCHARGE_TYPES = [
  { v: 'exceso', l: 'Exceso de uso' },
  { v: 'mora', l: 'Mora / pago tardío' },
  { v: 'reconexion', l: 'Reconexión' },
  { v: 'iva', l: 'IVA' },
  { v: 'ajuste', l: 'Ajuste / otro' },
];

function curPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function SurchargeModal({ svc, currency, onClose, onChanged }) {
  const period = curPeriod();
  const q = useFetch(`/api/recurring-services/${svc.id}/surcharges`, { params: { month: period } });
  const [type, setType] = useState('exceso');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = q.data?.data || [];
  const base = q.data?.base_amount ?? Number(svc.amount);
  const total = q.data?.total ?? base;

  async function add() {
    if (!amount) { toast.error('Escribe un monto'); return; }
    setBusy(true);
    try {
      await api.post(`/api/recurring-services/${svc.id}/surcharges`, { type, amount: Number(amount), period });
      setAmount('');
      q.refetch();
      onChanged?.();
    } catch (e) { toast.error(e?.response?.data?.error || 'Error'); }
    finally { setBusy(false); }
  }
  async function del(id) {
    try { await api.delete(`/api/recurring-services/surcharges/${id}`); q.refetch(); onChanged?.(); }
    catch { toast.error('No se pudo eliminar'); }
  }

  return (
    <Modal title={`Recargos · ${svc.name}`} onClose={onClose} maxWidth={460} footer={<button className="btn btn-ghost" onClick={onClose}>Cerrar</button>}>
      <div className="mute" style={{ fontSize: 11.5 }}>Periodo {period} · el monto varía cada mes según consumo y recargos</div>
      <div className="preview-box">
        <div className="pb-row"><span className="lbl">Monto base</span><span className="val num">{money(base, currency)}</span></div>
        {rows.map((r) => (
          <div className="pb-row" key={r.id}>
            <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {SURCHARGE_TYPES.find((t) => t.v === r.type)?.l || r.type}
              <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 13 }}>×</button>
            </span>
            <span className="val num" style={{ color: 'var(--red)' }}>+{money(r.amount, currency)}</span>
          </div>
        ))}
        <div className="pb-row total"><span className="lbl">Total mes</span><span className="val num">{money(total, currency)}</span></div>
      </div>
      <div className="field"><label>Agregar recargo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ flex: 1.4 }}>{SURCHARGE_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={add} disabled={busy}>+</button>
        </div>
      </div>
    </Modal>
  );
}

function ServiceModal({ svc, categories, accounts, onClose, onSaved }) {
  const [form, setForm] = useState(svc
    ? { ...svc, icon: svc.icon || 'zap' }
    : { name: '', amount: '', day_of_month: 1, category_id: '', account_id: '', active: true, icon: 'zap' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [confirmDelete, ConfirmUI] = useConfirm();

  async function save() {
    if (!form.name || !form.amount) { toast.error('Escribe nombre y monto'); return; }
    setBusy(true);
    const payload = {
      name: form.name, amount: Number(form.amount), day_of_month: Number(form.day_of_month) || 1,
      category_id: form.category_id ? Number(form.category_id) : null,
      account_id: form.account_id ? Number(form.account_id) : null,
      active: !!form.active, icon: form.icon, iconType: 'registry',
    };
    try {
      if (svc?.id) await api.put(`/api/recurring-services/${svc.id}`, payload);
      else await api.post('/api/recurring-services', payload);
      toast.success(svc ? 'Servicio actualizado' : 'Servicio creado');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!await confirmDelete({ title: '¿Eliminar servicio?' })) return;
    try { await api.delete(`/api/recurring-services/${svc.id}`); toast.success('Eliminado'); onSaved(); }
    catch { toast.error('No se pudo eliminar'); }
  }

  return (
    <Modal title={svc ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose} footer={
      <>
        {svc?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field"><label>Nombre</label><input value={form.name} onChange={set('name')} placeholder="CFE · Luz" /></div>
      <div className="field-row">
        <div className="field"><label>Monto</label><input type="number" step="0.01" value={form.amount} onChange={set('amount')} /></div>
        <div className="field"><label>Día del mes</label><input type="number" min="1" max="31" value={form.day_of_month} onChange={set('day_of_month')} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Categoría</label><select value={form.category_id || ''} onChange={set('category_id')}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label>Cuenta</label><select value={form.account_id || ''} onChange={set('account_id')}><option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      </div>
      <div className="field"><label>Icono</label><IconPicker value={form.icon} onChange={(key) => setForm((f) => ({ ...f, icon: key }))} /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Activo
      </label>
      {ConfirmUI}
    </Modal>
  );
}

function curPeriodLabel() {
  const d = new Date();
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
function curPeriodParam() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Per-row generate button with its own state
function GenerateBtn({ svc, currency, onGenerated }) {
  const [status, setStatus] = useState('idle'); // idle | busy | done | error | exists
  const [result, setResult] = useState(null);

  async function generate(e) {
    e.stopPropagation();
    setStatus('busy');
    try {
      const { data, status: httpStatus } = await api.post(
        `/api/recurring-services/${svc.id}/generate`,
        { month: curPeriodParam() },
        { validateStatus: (s) => s < 500 }
      );
      if (httpStatus === 201) {
        setStatus('done');
        setResult(data);
        toast.success(`Transacción creada · ${money(data.total_amount, currency)}`);
        onGenerated?.();
      } else if (httpStatus === 200 && data.status === 'already_generated') {
        setStatus('exists');
      } else {
        setStatus('error');
        toast.error(data?.reason || data?.error || 'No se pudo generar');
      }
    } catch {
      setStatus('error');
      toast.error('Error al generar');
    }
  }

  if (status === 'exists') {
    return (
      <span className="chip" style={{ color: 'var(--t3)', fontSize: 11.5 }}>
        <span className="dot" style={{ background: 'var(--t3)' }} />Ya generado
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="chip" style={{ color: 'var(--accent)', fontSize: 11.5 }}>
        <span className="dot" style={{ background: 'var(--accent)' }} />
        {money(result?.total_amount, currency)}
      </span>
    );
  }
  if (!svc.category_name || !svc.account_name) {
    return (
      <span title="Asigna categoría y cuenta primero" className="mute" style={{ fontSize: 11.5, cursor: 'default' }}>
        Sin config
      </span>
    );
  }
  return (
    <button
      className="btn btn-soft"
      style={{ padding: '4px 11px', fontSize: 12 }}
      disabled={status === 'busy'}
      onClick={generate}
    >
      {status === 'busy' ? (
        <span className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
      ) : (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      Generar
    </button>
  );
}

export default function Services() {
  const { currency } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [surcharge, setSurcharge] = useState(null);
  const q = useFetch('/api/recurring-services', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const categoriesQ = useFetch('/api/categories', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const accountsQ = useFetch('/api/accounts', { params: { per_page: 100 }, select: (d) => d.data || d.items || d });
  const services = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const categories = useMemo(() => (Array.isArray(categoriesQ.data) ? categoriesQ.data : []), [categoriesQ.data]);
  const accounts = useMemo(() => (Array.isArray(accountsQ.data) ? accountsQ.data : []), [accountsQ.data]);
  const totalBase = services.filter((s) => s.active).reduce((a, s) => a + Number(s.amount || 0), 0);

  function onSaved() { setOpen(false); setEditing(null); q.refetch(); }

  return (
    <>
      <PageHeader title="Servicios recurrentes">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
          <PlusIcon /> Nuevo servicio
        </button>
      </PageHeader>
      <div className="content">
        {q.loading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : services.length === 0 ? (
          <EmptyState
            title="Sin servicios"
            sub="Registra tus servicios recurrentes (luz, agua, internet…)"
            action={<button className="btn btn-primary" onClick={() => setOpen(true)}><PlusIcon /> Nuevo servicio</button>}
          />
        ) : (
          <>
            <div className="stats g3" style={{ marginBottom: 14 }}>
              <div className="stat">
                <div className="stat-lbl">Total base mensual</div>
                <div className="stat-val neg num">{money(totalBase, currency)}</div>
                <div className="stat-delta">{services.filter((s) => s.active).length} activos</div>
              </div>
            </div>

            <div className="tbl-wrap services-table">
              <div className="panel-head">
                <span className="panel-title">Servicios · {curPeriodLabel()}</span>
                <span className="mute" style={{ fontSize: 11.5 }}>
                  Monto = base + recargos del mes
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Categoría</th>
                    <th>Cuenta</th>
                    <th>Día</th>
                    <th>Estado</th>
                    <th>Recargos</th>
                    <th style={{ textAlign: 'right' }}>Base</th>
                    <th>Generar transacción</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setEditing(s); setOpen(true); }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Icon icon={s.icon} iconType={s.iconType} size={16} />
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                        </span>
                      </td>
                      <td className="mute">{s.category_name || <span style={{ color: 'var(--red)', fontSize: 11.5 }}>Sin categoría</span>}</td>
                      <td className="mute">{s.account_name || <span style={{ color: 'var(--red)', fontSize: 11.5 }}>Sin cuenta</span>}</td>
                      <td className="mute num">{s.day_of_month}</td>
                      <td>
                        {s.active
                          ? <span className="chip" style={{ color: 'var(--accent)' }}><span className="dot" style={{ background: 'var(--accent)' }} />Activo</span>
                          : <span className="chip">Pausado</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-soft"
                          style={{ padding: '4px 10px', fontSize: 11.5 }}
                          onClick={(e) => { e.stopPropagation(); setSurcharge(s); }}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M10 1L4 9h5l-2 6 7-8H9L10 1z" fill="currentColor" opacity=".8" />
                          </svg>
                          Recargos
                        </button>
                      </td>
                      <td className="amt neg">{money(s.amount, currency)}</td>
                      <td>
                        <GenerateBtn svc={s} currency={currency} onGenerated={() => {}} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {open && <ServiceModal svc={editing} categories={categories} accounts={accounts} onClose={() => setOpen(false)} onSaved={onSaved} />}
      {surcharge && <SurchargeModal svc={surcharge} currency={currency} onClose={() => setSurcharge(null)} onChanged={q.refetch} />}
    </>
  );
}
