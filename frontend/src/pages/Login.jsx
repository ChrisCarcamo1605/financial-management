import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <form onSubmit={submit} className="auth-form">
        <div className="panel panel-pad" style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div className="logo-icon">
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L5 7L8 9L11 4L14 6" stroke="var(--accent-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px' }}>Caudal</span>
          </div>

          <h1 className="auth-title">Bienvenido de vuelta</h1>
          <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 24 }}>Inicia sesión para continuar</div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="login-email">Correo electrónico</label>
            <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className="field" style={{ marginBottom: 4 }}>
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 18, padding: 10 }}>
            {busy ? 'Entrando…' : 'Iniciar sesión'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--t3)', marginTop: 20 }}>
            ¿Sin cuenta? <Link to="/register" style={{ color: 'var(--accent)' }}>Regístrate</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
