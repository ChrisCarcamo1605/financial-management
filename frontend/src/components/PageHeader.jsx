export default function PageHeader({ title, children }) {
  return (
    <div className="topbar">
      <span className="page-title">{title}</span>
      {children && <div className="topbar-right">{children}</div>}
    </div>
  );
}

export function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
