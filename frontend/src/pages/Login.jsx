import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const STATS = [
  { label: 'rendimiento promedio', value: '+18.4%', accent: true },
  { label: 'categorías activas', value: '12' },
  { label: 'transacciones registradas', value: '2,847' },
];

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Navigate reactively when auth state confirms — avoids the race condition
  // where navigate('/dashboard') fires before React commits setUser().
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  if (authLoading) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(formData.email, formData.password);
      // No navigate() here — the useEffect above handles it once isAuthenticated flips.
    } catch (err) {
      setError(
        err.code === 'invalid_credentials'
          ? 'Email o contraseña incorrectos'
          : err.error_description || err.message || 'Error al iniciar sesión'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const t = {
    bg: isDark ? '#020617' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    muted: isDark ? '#475569' : '#94a3b8',
    subtleMuted: isDark ? '#334155' : '#cbd5e1',
    inputBg: isDark ? '#020617' : '#ffffff',
    inputBorder: isDark ? '#1e293b' : '#e2e8f0',
    inputText: isDark ? '#e2e8f0' : '#0f172a',
    errorBg: isDark ? 'rgba(244,63,94,0.08)' : '#fff1f2',
    errorBorder: isDark ? 'rgba(244,63,94,0.2)' : '#fecdd3',
    errorText: isDark ? '#fb7185' : '#be123c',
    divider: isDark ? '#0f172a' : '#e2e8f0',
  };

  return (
    <>
      <style>{`
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes loginBtnSpin {
          to { transform: rotate(360deg); }
        }
        .auth-panel { animation: authFadeIn 0.32s ease-out; }
        .login-btn {
          width: 100%; height: 48px; border: none; border-radius: 10px;
          background: #338dfc; color: white;
          font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.9375rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 8px; letter-spacing: 0.01em;
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
        }
        .login-btn:hover:not(:disabled) {
          background: #1d6ef1;
          box-shadow: 0 4px 20px rgba(51,141,252,0.45);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .login-btn-spin {
          width: 16px; height: 16px; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: loginBtnSpin 0.7s linear infinite;
        }
        .login-field {
          width: 100%; height: 44px; padding: 0 14px; box-sizing: border-box;
          border-radius: 8px; font-size: 0.9375rem; outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-field:focus {
          border-color: #338dfc !important;
          box-shadow: 0 0 0 3px rgba(51,141,252,0.12);
        }
        .theme-btn {
          position: fixed; top: 1.25rem; right: 1.25rem; z-index: 1000;
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.875rem; cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          background: transparent;
        }
        .theme-btn:hover { opacity: 0.8; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: t.bg }}>

        {/* Theme toggle */}
        <button
          className="theme-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
          style={{ border: `1.5px solid ${t.inputBorder}`, color: t.muted }}
        >
          <i className={`bi bi-${isDark ? 'sun' : 'moon'}-fill`} />
        </button>

        {/* ── Left panel ── */}
        <div
          className="d-none d-lg-flex"
          style={{
            flex: '0 0 46%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
            position: 'relative',
            overflow: 'hidden',
            padding: '3rem',
          }}
        >
          {/* Dot grid texture */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(51,141,252,0.1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          {/* Ambient glow blobs */}
          <div style={{
            position: 'absolute', top: -100, left: -80,
            width: 340, height: 340, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(51,141,252,0.18) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, right: -60,
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 340 }}>
            {/* Brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'linear-gradient(135deg, #338dfc, #1558de)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.125rem',
                boxShadow: '0 4px 16px rgba(51,141,252,0.4)',
              }}>
                <i className="bi bi-wallet2" />
              </div>
              <span style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.0625rem',
                color: 'white', letterSpacing: '-0.02em',
              }}>
                FinanceApp
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '2.625rem', lineHeight: 1.15,
              color: 'white', letterSpacing: '-0.03em',
              marginBottom: '0.875rem',
            }}>
              Tu dinero,<br />
              <span style={{ color: '#338dfc' }}>bajo control.</span>
            </h2>
            <p style={{
              color: '#475569', fontSize: '0.9rem', lineHeight: 1.65,
              marginBottom: '2.25rem',
            }}>
              Registra, analiza y optimiza tus finanzas desde un solo lugar.
            </p>

            {/* Stats block */}
            <div style={{ borderRadius: 10, overflow: 'hidden' }}>
              {STATS.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px',
                  background: i === 0 ? 'rgba(51,141,252,0.07)' : 'rgba(255,255,255,0.025)',
                  borderBottom: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{
                    color: '#475569', fontSize: '0.8125rem',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {s.label}
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
                    fontSize: '0.9rem',
                    color: s.accent ? '#34d399' : '#64748b',
                  }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2.5rem 1.5rem',
        }}>
          <div className="auth-panel" style={{ width: '100%', maxWidth: 392 }}>

            {/* Mobile brand */}
            <div className="d-lg-none" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 13, margin: '0 auto 10px',
                background: 'linear-gradient(135deg, #338dfc, #1558de)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.375rem',
                boxShadow: '0 4px 14px rgba(51,141,252,0.35)',
              }}>
                <i className="bi bi-wallet2" />
              </div>
              <p style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                fontSize: '1.0625rem', color: t.text, margin: 0,
              }}>
                FinanceApp
              </p>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                fontSize: '1.625rem', color: t.text,
                letterSpacing: '-0.02em', marginBottom: 4,
              }}>
                Inicia sesión
              </h1>
              <p style={{ color: t.muted, fontSize: '0.875rem', margin: 0 }}>
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="animate-shake" style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                padding: '11px 14px', borderRadius: 8, marginBottom: '1.25rem',
                background: t.errorBg,
                border: `1px solid ${t.errorBorder}`,
              }}>
                <i className="bi bi-exclamation-circle"
                  style={{ color: t.errorText, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: t.errorText, fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="email" style={{
                  display: 'block', marginBottom: 6,
                  fontSize: '0.8125rem', fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#475569',
                  fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em',
                }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="login-field"
                  placeholder="usuario@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                  style={{
                    border: `1.5px solid ${t.inputBorder}`,
                    background: t.inputBg,
                    color: t.inputText,
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="password" style={{
                  display: 'block', marginBottom: 6,
                  fontSize: '0.8125rem', fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#475569',
                  fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em',
                }}>
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  className="login-field"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{
                    border: `1.5px solid ${t.inputBorder}`,
                    background: t.inputBg,
                    color: t.inputText,
                  }}
                />
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={submitting}
                style={{ marginBottom: '1.25rem' }}
              >
                {submitting ? (
                  <>
                    <span className="login-btn-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right" />
                    Continuar
                  </>
                )}
              </button>

              <p style={{
                textAlign: 'center', fontSize: '0.875rem',
                color: t.muted, margin: 0,
              }}>
                ¿No tienes cuenta?{' '}
                <Link
                  to="/register"
                  style={{ color: '#338dfc', textDecoration: 'none', fontWeight: 500 }}
                >
                  Regístrate
                </Link>
              </p>
            </form>

            <div style={{ height: 1, background: t.divider, margin: '1.75rem 0 1.25rem' }} />

            <p style={{
              textAlign: 'center', fontSize: '0.75rem',
              color: t.subtleMuted, margin: 0,
            }}>
              Al continuar, aceptas los{' '}
              <span style={{ color: t.muted }}>términos de servicio</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
