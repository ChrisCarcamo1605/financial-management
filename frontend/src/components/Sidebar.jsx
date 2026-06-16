import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard',    icon: 'speedometer2',   label: 'Dashboard' },
      { path: '/transactions', icon: 'arrow-left-right', label: 'Transacciones' },
      { path: '/accounts',     icon: 'bank',           label: 'Cuentas' },
      { path: '/categories',   icon: 'tags',           label: 'Categorías' },
      { path: '/budgets',      icon: 'pie-chart',      label: 'Presupuestos' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { path: '/fuentes-ingreso', icon: 'cash-stack',       label: 'Fuentes Ingreso' },
      { path: '/prestamos',       icon: 'credit-card',      label: 'Préstamos' },
      { path: '/servicios',       icon: 'arrow-repeat',     label: 'Servicios' },
      { path: '/quincenas',       icon: 'calendar2-week',   label: 'Quincenas' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { path: '/reports',    icon: 'graph-up',      label: 'Reportes' },
      { path: '/analytics',  icon: 'bar-chart-line', label: 'Analytics' },
    ],
  },
];

function getUserInitials(user) {
  const name = (user?.email || '').split('@')[0];
  return name.substring(0, 2).toUpperCase() || '?';
}

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const isDark = theme === 'dark';

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const initials = getUserInitials(user);
  const username = user.email?.split('@')[0] || 'Usuario';

  // ── Theming tokens ─────────────────────────────────────────────────────────
  const bg       = isDark ? '#0f172a' : '#ffffff';
  const border   = isDark ? '#1e293b' : '#f1f5f9';
  const text     = isDark ? '#e2e8f0' : '#334155';
  const muted    = isDark ? '#475569' : '#94a3b8';
  const hoverBg  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)';
  const activeBg = isDark ? 'rgba(51,141,252,0.12)' : 'rgba(51,141,252,0.08)';
  const activeClr = '#338dfc';

  const sidebarStyle = {
    background: bg,
    borderRight: `1px solid ${border}`,
  };

  const activeItemStyle = {
    background: activeBg,
    color: activeClr,
    borderLeft: `2px solid ${activeClr}`,
  };
  const itemStyle = {
    color: text,
    borderLeft: '2px solid transparent',
  };

  // ── Nav item ───────────────────────────────────────────────────────────────
  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <div className={`sb-item-wrap${isActive ? ' sb-active' : ''}`}>
        <Link
          to={item.path}
          className="sb-item"
          style={isActive ? activeItemStyle : itemStyle}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
          <i className={`bi bi-${item.icon} sb-icon`} />
          {!collapsed && <span className="sb-label">{item.label}</span>}
        </Link>
        {collapsed && <span className="sb-tooltip" style={{ background: isDark ? '#1e293b' : '#0f172a' }}>{item.label}</span>}
      </div>
    );
  };

  const sidebarBody = (
    <aside
      className={`app-sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' sidebar-mobile-open' : ''}`}
      style={sidebarStyle}
    >
      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <div className="sb-brand" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="sb-logo">
          <i className="bi bi-wallet2" />
        </div>
        {!collapsed && (
          <span className="sb-brand-name" style={{ color: text }}>FinanceApp</span>
        )}
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="sb-nav">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className="sb-group" style={{ borderTop: gi > 0 ? `1px solid ${border}` : 'none' }}>
            {!collapsed && (
              <p className="sb-group-label" style={{ color: muted }}>{group.label}</p>
            )}
            {group.items.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Bottom ─────────────────────────────────────────────────────────── */}
      <div className="sb-bottom" style={{ borderTop: `1px solid ${border}` }}>

        {/* Theme toggle */}
        <button
          className="sb-icon-btn"
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
          style={{ color: muted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = text; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
        >
          <i className={`bi bi-${isDark ? 'sun' : 'moon'}-fill`} />
          {!collapsed && <span className="sb-label" style={{ color: muted }}>Tema</span>}
        </button>

        {/* User menu */}
        <div className="sb-user-wrap" ref={userMenuRef}>
          <button
            className="sb-user-trigger"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{ color: text }}
            onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="sb-avatar">{initials}</div>
            {!collapsed && (
              <>
                <div className="sb-user-info">
                  <span className="sb-username" style={{ color: text }}>{username}</span>
                  <span className="sb-email" style={{ color: muted }}>{user.email}</span>
                </div>
                <i className="bi bi-three-dots-vertical sb-dots" style={{ color: muted }} />
              </>
            )}
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div
              className={`sb-user-dropdown${collapsed ? ' dropdown-right' : ' dropdown-up'}`}
              style={{ background: isDark ? '#1e293b' : '#ffffff', border: `1px solid ${border}` }}
            >
              <div className="sb-dropdown-header" style={{ borderBottom: `1px solid ${border}` }}>
                <div className="sb-avatar sb-avatar-lg">{initials}</div>
                <div>
                  <p className="sb-dd-name" style={{ color: text }}>{username}</p>
                  <p className="sb-dd-email" style={{ color: muted }}>{user.email}</p>
                </div>
              </div>
              <button
                className="sb-logout-btn"
                onClick={handleLogout}
                style={{ color: isDark ? '#fb7185' : '#e11d48' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(244,63,94,0.08)' : '#fff1f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <i className="bi bi-box-arrow-right" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          className="sb-icon-btn sb-collapse-btn d-none d-lg-flex"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir' : 'Colapsar'}
          style={{ color: muted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = text; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
        >
          <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`} />
          {!collapsed && <span className="sb-label" style={{ color: muted }}>Colapsar</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="mobile-topbar d-lg-none" style={{ background: bg, borderBottom: `1px solid ${border}` }}>
        <button
          className="sb-hamburger"
          onClick={() => setMobileOpen(true)}
          style={{ color: text }}
        >
          <i className="bi bi-list" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sb-logo sb-logo-sm">
            <i className="bi bi-wallet2" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', color: text }}>
            FinanceApp
          </span>
        </div>
        <button
          className="sb-hamburger"
          onClick={toggleTheme}
          style={{ color: muted }}
          aria-label="Toggle theme"
        >
          <i className={`bi bi-${isDark ? 'sun' : 'moon'}-fill`} />
        </button>
      </div>

      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="sb-backdrop d-lg-none"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {sidebarBody}
    </>
  );
};

export default Sidebar;
