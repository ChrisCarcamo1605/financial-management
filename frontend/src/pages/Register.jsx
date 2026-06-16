import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  if (authLoading) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) return setError('Las contraseñas no coinciden');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');

    setSubmitting(true);
    try {
      await register(email, password);
      // navigate handled by the useEffect above when isAuthenticated flips
    } catch (err) {
      setError(err.error || err.message || 'Error al registrar');
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
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes regBtnSpin { to { transform: rotate(360deg); } }
        .auth-panel { animation: authFadeIn 0.32s ease-out; }
        .reg-btn {
          width: 100%; height: 48px; border: none; border-radius: 10px;
          background: #338dfc; color: white;
          font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.9375rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 8px; letter-spacing: 0.01em;
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
        }
        .reg-btn:hover:not(:disabled) {
          background: #1d6ef1;
          box-shadow: 0 4px 20px rgba(51,141,252,0.45);
          transform: translateY(-1px);
        }
        .reg-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .reg-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .reg-btn-spin {
          width: 16px; height: 16px; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: regBtnSpin 0.7s linear infinite;
        }
        .reg-field {
          width: 100%; height: 44px; padding: 0 14px; box-sizing: border-box;
          border-radius: 8px; font-size: 0.9375rem; outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .reg-field:focus {
          border-color: #338dfc !important;
          box-shadow: 0 0 0 3px rgba(51,141,252,0.12);
        }
        .theme-btn-reg {
          position: fixed; top: 1.25rem; right: 1.25rem; z-index: 1000;
          width: 38px; height: 38px; border-radius: 50%; background: transparent;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.875rem; cursor: pointer; transition: opacity 0.15s;
        }
        .theme-btn-reg:hover { opacity: 0.8; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: t.bg, alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem' }}>
        <button
          className="theme-btn-reg"
          onClick={toggleTheme}
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
          style={{ border: `1.5px solid ${t.inputBorder}`, color: t.muted }}
        >
          <i className={`bi bi-${isDark ? 'sun' : 'moon'}-fill`} />
        </button>

        <div className="auth-panel" style={{ width: '100%', maxWidth: 392 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 13, margin: '0 auto 10px',
              background: 'linear-gradient(135deg, #338dfc, #1558de)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.375rem',
              boxShadow: '0 4px 14px rgba(51,141,252,0.35)',
            }}>
              <i className="bi bi-wallet2" />
            </div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.0625rem', color: t.text, margin: 0 }}>
              FinanceApp
            </p>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.625rem', color: t.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
              Crear cuenta
            </h1>
            <p style={{ color: t.muted, fontSize: '0.875rem', margin: 0 }}>
              Comienza a gestionar tus finanzas hoy
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-shake" style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              padding: '11px 14px', borderRadius: 8, marginBottom: '1.25rem',
              background: t.errorBg, border: `1px solid ${t.errorBorder}`,
            }}>
              <i className="bi bi-exclamation-circle" style={{ color: t.errorText, marginTop: 1, flexShrink: 0 }} />
              <span style={{ color: t.errorText, fontSize: '0.875rem', lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {[
              { id: 'email', label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'usuario@ejemplo.com', autoComplete: 'email' },
              { id: 'password', label: 'Contraseña', type: 'password', value: password, onChange: setPassword, placeholder: '••••••••', autoComplete: 'new-password' },
              { id: 'confirm', label: 'Confirmar contraseña', type: 'password', value: confirmPassword, onChange: setConfirmPassword, placeholder: '••••••••', autoComplete: 'new-password' },
            ].map((f, i) => (
              <div key={f.id} style={{ marginBottom: i === 2 ? '1.5rem' : '1rem' }}>
                <label htmlFor={f.id} style={{ display: 'block', marginBottom: 6, fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#94a3b8' : '#475569', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em' }}>
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type={f.type}
                  className="reg-field"
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  required
                  autoComplete={f.autoComplete}
                  style={{ border: `1.5px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText }}
                />
              </div>
            ))}

            <button type="submit" className="reg-btn" disabled={submitting} style={{ marginBottom: '1.25rem' }}>
              {submitting ? (
                <><span className="reg-btn-spin" />Creando cuenta...</>
              ) : (
                <><i className="bi bi-person-plus" />Crear cuenta</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: t.muted, margin: 0 }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" style={{ color: '#338dfc', textDecoration: 'none', fontWeight: 500 }}>
                Inicia sesión
              </Link>
            </p>
          </form>

          <div style={{ height: 1, background: t.divider, margin: '1.75rem 0 1.25rem' }} />
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: t.subtleMuted, margin: 0 }}>
            Al registrarte, aceptas los <span style={{ color: t.muted }}>términos de servicio</span>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
