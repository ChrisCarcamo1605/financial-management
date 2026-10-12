import { useState, useCallback, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { TitleProvider, useTitle } from '../context/TitleContext';

function Inner() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const { title } = useTitle();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        close();
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <div className={`sidebar-overlay${open ? ' visible' : ''}`} onClick={close} aria-hidden="true" />

      <Sidebar open={open} onClose={close} />

      <main className="main" id="main-content" tabIndex={-1}>
        {/* Mobile-only top bar */}
        <div className="mobile-topbar">
          <button ref={menuButtonRef} className="hamburger" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="main-navigation">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="mobile-logo">
            <div className="mobile-logo-icon">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L5 7L8 9L11 4L14 6" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: 'var(--t2)', fontSize: 14 }}>{title || 'Caudal'}</span>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}

export default function Layout() {
  return (
    <TitleProvider>
      <Inner />
    </TitleProvider>
  );
}
