import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }

    if (password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres');
    }

    setLoading(true);

    try {
      await register(email, password);
      setSuccess('Cuenta creada exitosamente. Redirigiendo...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.error_description || err.msg || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-vh-100 d-flex position-relative" style={{ background: isDark ? '#020617' : '#f8fafc' }}>
      {/* Theme Toggle - Top Right */}
      <Button
        variant="outline-secondary"
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 1000,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.125rem',
          border: `2px solid ${isDark ? '#475569' : '#cbd5e1'}`,
          color: isDark ? '#cbd5e1' : '#475569',
          backgroundColor: 'transparent',
          transition: 'all 0.2s',
        }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <i className={`bi bi-${isDark ? 'sun' : 'moon'}-fill`}></i>
      </Button>

      <Container className="d-flex align-items-center justify-content-center">
        <Card
          className="w-100 animate-fade-in-up"
          style={{
            maxWidth: '440px',
            border: 'none',
            boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : 'var(--shadow-xl)',
            background: isDark ? '#1e293b' : 'white',
          }}
        >
          <Card.Body className="p-5">
            {/* Logo */}
            <div className="text-center mb-4">
              <div
                className="mx-auto d-flex align-items-center justify-content-center"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  fontSize: '2rem',
                  boxShadow: '0 8px 24px rgba(51, 141, 252, 0.3)',
                }}
              >
                <i className="bi bi-wallet2"></i>
              </div>
              <h2 className="mt-3 mb-1" style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>Crear Cuenta</h2>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Comienza a gestionar tus finanzas hoy</p>
            </div>

            {error && (
              <Alert variant="danger" className="animate-shake">
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="animate-fade-in">
                <i className="bi bi-check-circle me-2"></i>
                {success}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-500" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ padding: '0.75rem 1rem', background: isDark ? '#0f172a' : 'white', borderColor: isDark ? '#475569' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-500" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ padding: '0.75rem 1rem', background: isDark ? '#0f172a' : 'white', borderColor: isDark ? '#475569' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-500" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Confirmar Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ padding: '0.75rem 1rem', background: isDark ? '#0f172a' : 'white', borderColor: isDark ? '#475569' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }}
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                className="w-100 mb-3"
                style={{ padding: '0.75rem', fontSize: '1rem' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus me-2"></i>
                    Crear Cuenta
                  </>
                )}
              </Button>

              <div className="text-center">
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>¿Ya tienes cuenta? </span>
                <Link to="/login" className="text-decoration-none fw-500" style={{ color: '#338dfc' }}>
                  Inicia sesión
                </Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Register;
