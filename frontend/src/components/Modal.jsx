import { useId } from 'react';
import useDialogA11y from '../hooks/useDialogA11y';

export default function Modal({ title, onClose, children, footer, maxWidth }) {
  const titleId = useId();
  const dialogRef = useDialogA11y(onClose);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <div className="m-head">
          <h2 className="m-title" id={titleId}>{title}</h2>
          <button className="m-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="m-body">{children}</div>
        {footer && <div className="m-foot">{footer}</div>}
      </div>
    </div>
  );
}
