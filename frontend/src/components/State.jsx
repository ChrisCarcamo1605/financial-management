export function Loading({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 44 }} />
      ))}
    </div>
  );
}

export function EmptyState({ title = 'Sin datos', sub, action }) {
  return (
    <div className="empty">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, margin: '0 auto' }}>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18M7 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const msg = error?.response?.data?.message || error?.message || 'Error al cargar';
  return (
    <div className="empty">
      <div className="empty-title" style={{ color: 'var(--red)' }}>No se pudo cargar</div>
      <div className="empty-sub">{msg}</div>
      {onRetry && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onRetry}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
