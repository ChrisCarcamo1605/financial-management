import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setBusy(true);
    try {
      await register(email, password);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <form onSubmit={submit} style={{ width: 360 }}>
        <div className="panel panel-pad" style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div className="logo-icon">
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L5 7L8 9L11 4L14 6" stroke="var(--accent-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px' }}>Caudal</span>
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Crea tu cuenta</div>
          <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 24 }}>Empieza a controlar tu flujo de dinero</div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Correo electrónico</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className="field" style={{ marginBottom: 4 }}>
            <label>Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 18, padding: 10 }}>
            {busy ? 'Creando…' : 'Crear cuenta'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--t3)', marginTop: 20 }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--accent)' }}>Inicia sesión</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
