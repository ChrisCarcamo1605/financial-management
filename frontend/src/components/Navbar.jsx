import React, { useState, useRef, useEffect } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    const email = user.email || '';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { path: '/dashboard', icon: 'speedometer2', label: 'Dashboard' },
    { path: '/transactions', icon: 'arrow-left-right', label: 'Transacciones' },
    { path: '/accounts', icon: 'bank', label: 'Cuentas' },
    { path: '/categories', icon: 'tags', label: 'Categorías' },
    { path: '/budgets', icon: 'pie-chart', label: 'Presupuestos' },
    { path: '/fuentes-ingreso', icon: 'cash-stack', label: 'Ingresos' },
    { path: '/prestamos', icon: 'credit-card', label: 'Préstamos' },
    { path: '/quincenas', icon: 'calendar2-week', label: 'Quincenas' },
    { path: '/reports', icon: 'graph-up', label: 'Reportes' },
    { path: '/analytics', icon: 'bar-chart-line', label: 'Analytics' },
  ];

  if (!user) return null;

  return (
    <Navbar
      bg="light"
      variant="light"
      expand="lg"
      className="border-bottom"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--slate-200)',
        padding: '0.625rem 0',
        zIndex: 'var(--z-sticky)',
        position: 'sticky',
        top: 0,
      }}
    >
      <Container>
        <Navbar.Brand
          as={Link}
          to="/dashboard"
          className="d-flex align-items-center gap-2"
          style={{
            fontWeight: 700,
            fontSize: '1.25rem',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.125rem',
              boxShadow: '0 2px 8px rgba(51, 141, 252, 0.3)',
            }}
          >
            <i className="bi bi-wallet2"></i>
          </div>
          <span className="text-gradient">FinanceApp</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />

        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Nav.Link
                  key={item.path}
                  as={Link}
                  to={item.path}
                  className="d-flex align-items-center gap-2 px-3 py-2"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 500,
                    fontSize: '0.9375rem',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                    color: isActive ? 'var(--primary-700)' : 'var(--slate-600)',
                  }}
                >
                  <i className={`bi bi-${item.icon}`}></i>
                  {item.label}
                </Nav.Link>
              );
            })}
          </Nav>

          <Nav className="d-flex align-items-center gap-2">
            {/* Dark Mode Toggle - subtle icon button */}
            <button
              onClick={toggleTheme}
              className="btn btn-link p-0 text-decoration-none d-flex align-items-center justify-content-center"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                fontSize: '1.125rem',
                color: 'var(--slate-500)',
                backgroundColor: 'transparent',
                border: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                e.currentTarget.style.color = 'var(--slate-700)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--slate-500)';
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              <i className={`bi bi-${theme === 'dark' ? 'sun' : 'moon'}-fill`}></i>
            </button>

            {/* User Dropdown - Custom Modern */}
            <div className="position-relative" ref={dropdownRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`user-menu-trigger${userMenuOpen ? ' active' : ''}`}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <div className="user-avatar">{getUserInitials()}</div>
                <span className="user-name d-none d-lg-inline">
                  {user.email?.split('@')[0] || 'Usuario'}
                </span>
                <i
                  className={`bi bi-chevron-${userMenuOpen ? 'up' : 'down'} user-chevron`}
                ></i>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="user-dropdown-menu">
                  {/* User Info Header */}
                  <div className="user-dropdown-header">
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <div className="header-avatar">{getUserInitials()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="header-name text-truncate">
                          {user.email?.split('@')[0] || 'Usuario'}
                        </div>
                        <div className="header-email text-truncate">
                          {user.email || ''}
                        </div>
                      </div>
                    </div>
                    <span className="status-badge">
                      <span className="status-dot"></span>
                      Conectado
                    </span>
                  </div>

                  {/* Logout Button */}
                  <div className="user-dropdown-logout">
                    <button onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right"></i>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
