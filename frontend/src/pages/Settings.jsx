import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader, { PlusIcon } from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading } from '../components/State';
import { useFetch } from '../hooks/useFetch';
import { useTheme, ACCENT_OPTIONS } from '../context/ThemeContext';
import api from '../lib/api';
import { money } from '../lib/format';

const CAT_ICONS = ['🍽️', '🛒', '🚗', '🏠', '⚡', '💊', '🎬', '💰', '✈️', '🎓', '🐖', '📱'];
const CAT_COLORS = ['#10b981', '#f59e0b', '#f87171', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];

function CategoryModal({ cat, defaultType, onClose, onSaved }) {
  const [form, setForm] = useState(cat ? { ...cat } : { name: '', type: defaultType, color: '#10b981', icon: '🍽️', icon_type: 'emoji' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name) { toast.error('Escribe un nombre'); return; }
    setBusy(true);
    const payload = { name: form.name, type: form.type, color: form.color, icon: form.icon, iconType: form.icon_type || 'emoji' };
    try {
      if (cat?.id) await api.put(`/api/categories/${cat.id}`, payload);
      else await api.post('/api/categories', payload);
      toast.success(cat ? 'Categoría actualizada' : 'Categoría creada');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm('¿Eliminar categoría?')) return;
    try { await api.delete(`/api/categories/${cat.id}`); toast.success('Eliminada'); onSaved(); }
    catch (e) { toast.error(e?.response?.data?.message || 'No se pudo eliminar (¿tiene presupuestos?)'); }
  }

  return (
    <Modal title={cat ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose} footer={
      <>
        {cat?.id && <button className="btn btn-danger push" onClick={remove}>Eliminar</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      <div className="field"><label>Nombre</label><input value={form.name} onChange={set('name')} placeholder="Alimentación" /></div>
      <div className="field"><label>Tipo</label>
        <div className="seg-toggle">
          <button className={form.type === 'income' ? 'on-inc' : ''} onClick={() => setForm((f) => ({ ...f, type: 'income' }))}>Ingreso</button>
          <button className={form.type === 'expense' ? 'on-exp' : ''} onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}>Gasto</button>
        </div>
      </div>
      <div className="field"><label>Color</label><div className="swatches">{CAT_COLORS.map((c) => <span key={c} className={`sw${form.color === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => setForm((f) => ({ ...f, color: c }))} />)}</div></div>
      <div className="field"><label>Icono</label><div className="icon-grid">{CAT_ICONS.map((ic) => <span key={ic} className={`ic-opt${form.icon === ic ? ' sel' : ''}`} onClick={() => setForm((f) => ({ ...f, icon: ic, icon_type: 'emoji' }))}>{ic}</span>)}</div></div>
    </Modal>
  );
}

export default function Settings() {
  const { theme, accent, currency, setTheme, setAccent, setCurrency } = useTheme();
  const [catType, setCatType] = useState('expense');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const catQ = useFetch('/api/categories', { params: { per_page: 200 }, select: (d) => d.data || d.items || d });
  const categories = useMemo(() => (Array.isArray(catQ.data) ? catQ.data : []), [catQ.data]);
  const shown = categories.filter((c) => c.type === catType);

  function onSaved() { setOpen(false); setEditing(null); catQ.refetch(); }

  return (
    <>
      <PageHeader title="Ajustes">
        <span className="mute" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="dot" style={{ background: 'var(--accent)' }} />Guardado automáticamente
        </span>
      </PageHeader>
      <div className="content" style={{ maxWidth: 920 }}>
        {/* Appearance */}
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head"><div><div className="m-title" style={{ fontSize: 14 }}>Apariencia</div><div className="mute" style={{ fontSize: 12 }}>Color de acento y tema · se guarda en tu cuenta</div></div></div>
          <div className="panel-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Color de acento</label>
                <div className="swatches" style={{ gap: 12 }}>
                  {ACCENT_OPTIONS.map((c) => (
                    <span key={c} onClick={() => setAccent(c)} style={{ width: 36, height: 36, borderRadius: 9, background: c, cursor: 'pointer', border: accent === c ? '2.5px solid var(--text)' : '2.5px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {accent === c && <span style={{ color: '#000', fontWeight: 800 }}>✓</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Tema</label>
                <div className="seg-toggle">
                  <button className={theme === 'dark' ? 'on-inc' : ''} onClick={() => setTheme('dark')}>Oscuro</button>
                  <button className={theme === 'light' ? 'on-inc' : ''} onClick={() => setTheme('light')}>Claro</button>
                </div>
              </div>
              <div className="field">
                <label>Moneda</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD · Dólar</option>
                  <option value="MXN">MXN · Peso mexicano</option>
                  <option value="EUR">EUR · Euro</option>
                </select>
              </div>
            </div>
            <div className="preview-box">
              <div className="stat-lbl" style={{ marginBottom: 12 }}>Vista previa</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.5px' }}>{money(142580, currency)}</div>
              <div className="bar-bg" style={{ height: 5, margin: '12px 0' }}><div className="bar-fill" style={{ width: '68%' }} /></div>
              <span className="btn btn-primary" style={{ marginTop: 4 }}>Botón primario</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="panel">
          <div className="panel-head"><div><div className="m-title" style={{ fontSize: 14 }}>Categorías</div><div className="mute" style={{ fontSize: 12 }}>Crea y personaliza categorías de ingresos y gastos</div></div></div>
          <div className="panel-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div className="seg">
                <button className={catType === 'expense' ? 'on' : ''} onClick={() => setCatType('expense')}>Gastos</button>
                <button className={catType === 'income' ? 'on' : ''} onClick={() => setCatType('income')}>Ingresos</button>
              </div>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon /> Nueva categoría</button>
            </div>
            {catQ.loading ? <Loading rows={4} /> : shown.length === 0 ? (
              <div className="empty-sub" style={{ color: 'var(--t3)' }}>Sin categorías de {catType === 'expense' ? 'gasto' : 'ingreso'}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {shown.map((c) => (
                  <div key={c.id} className="preview-box" style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }} onClick={() => { setEditing(c); setOpen(true); }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: `color-mix(in srgb, ${c.color || 'var(--accent)'} 16%, transparent)`, flexShrink: 0 }}>{c.icon && (c.icon_type === 'emoji' || !c.icon.includes('<')) ? c.icon : '•'}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div><div className="mute" style={{ fontSize: 11 }}>{c.type === 'income' ? 'Ingreso' : 'Gasto'}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {open && <CategoryModal cat={editing} defaultType={catType} onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}
