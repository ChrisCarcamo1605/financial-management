import { useEffect } from 'react';

/**
 * Confirmation dialog — replaces browser `confirm()`.
 *
 * Props:
 *   title    – heading text  (default "¿Eliminar?")
 *   message  – body text
 *   danger   – if true, confirm button is red  (default true)
 *   onConfirm, onCancel – callbacks
 */
export default function ConfirmModal({
  title = '¿Eliminar?',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop"
      style={{ alignItems: 'center' }}
      onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div
        className="modal"
        style={{ maxWidth: 380 }}
      >
        <div className="m-head" style={{ borderBottom: 'none', paddingBottom: 8 }}>
          <span className="m-title">{title}</span>
          <button className="m-close" onClick={onCancel} aria-label="Cerrar">×</button>
        </div>

        {message && (
          <div style={{ padding: '0 20px 16px', fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.6 }}>
            {message}
          </div>
        )}

        <div className="m-foot" style={{ gap: 8 }}>
          <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn"
            style={{
              background: danger ? 'var(--red-bg)' : 'var(--accent-bg)',
              color: danger ? 'var(--red)' : 'var(--accent)',
              border: `1px solid ${danger ? 'color-mix(in srgb, var(--red) 30%, transparent)' : 'var(--accent-border)'}`,
            }}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
