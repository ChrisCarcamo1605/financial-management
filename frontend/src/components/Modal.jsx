import { useEffect } from 'react';

export default function Modal({ title, onClose, children, footer, maxWidth }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="m-head">
          <span className="m-title">{title}</span>
          <button className="m-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="m-body">{children}</div>
        {footer && <div className="m-foot">{footer}</div>}
      </div>
    </div>
  );
}
