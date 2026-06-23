import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';
import { IoIosSettings } from "react-icons/io";

const I = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  tx: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  budgets: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2 12V7l6-5 6 5v5H10V9H6v3H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  savings: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C5 4 3 6 3 9a5 5 0 0010 0c0-3-2-5-5-7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  quincenas: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  loans: (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 6h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  income: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 1v14M5 4h4.5a2.5 2.5 0 010 5H5m0-5H3m2 5h5.5a2.5 2.5 0 010 5H5m0-5v5M3 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  services: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8A5.5 5.5 0 012.5 8M2.5 8l2-2M2.5 8l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2 12L5 8l3 2 3-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
   <IoIosSettings />
  ),
};

const NAV = [
  { section: null, items: [
    { to: '/', label: 'Dashboard', icon: I.dashboard, end: true },
    { to: '/transactions', label: 'Transacciones', icon: I.tx },
    { to: '/accounts', label: 'Cuentas', icon: I.accounts },
  ]},
  { section: 'Finanzas', items: [
    { to: '/budgets', label: 'Presupuestos', icon: I.budgets },
    { to: '/savings', label: 'Ahorros', icon: I.savings },
    { to: '/quincenas', label: 'Quincenas', icon: I.quincenas },
    { to: '/loans', label: 'Préstamos', icon: I.loans },
    { to: '/income-sources', label: 'Fuentes de Ingreso', icon: I.income },
    { to: '/services', label: 'Servicios', icon: I.services },
  ]},
  { section: 'Análisis', items: [
    { to: '/analytics', label: 'Analytics', icon: I.analytics },
  ]},
  { section: 'Sistema', items: [
    { to: '/settings', label: 'Ajustes', icon: I.settings },
  ]},
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const initials = (user?.email || 'U').slice(0, 2).toUpperCase();

  // close sidebar when navigating on mobile
  const handleNav = useCallback(() => {
    if (window.innerWidth <= 768) onClose?.();
  }, [onClose]);

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sb-logo">
        <div className="logo-icon">
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <path d="M2 12L5 7L8 9L11 4L14 6" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="logo-name">Caudal</span>
      </div>

      <nav className="sb-nav">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.section && <div className="ng-label">{group.section}</div>}
            {group.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={handleNav}
                className={({ isActive }) => `ni${isActive ? ' active' : ''}`}
              >
                {it.icon}
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="avatar">{initials}</div>
        <span className="user-name">{user?.email || 'Usuario'}</span>
        <button className="sb-logout" onClick={logout} title="Cerrar sesión">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
