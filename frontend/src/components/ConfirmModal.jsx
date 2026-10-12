import { useId } from 'react';
import useDialogA11y from '../hooks/useDialogA11y';

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
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useDialogA11y(onCancel);

  return (
    <div
      className="modal-backdrop"
      style={{ alignItems: 'center' }}
      onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        tabIndex={-1}
        style={{ maxWidth: 380 }}
      >
        <div className="m-head" style={{ borderBottom: 'none', paddingBottom: 8 }}>
          <h2 className="m-title" id={titleId}>{title}</h2>
          <button className="m-close" onClick={onCancel} aria-label="Cerrar">×</button>
        </div>

        {message && (
          <div id={messageId} style={{ padding: '0 20px 16px', fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.6 }}>
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
