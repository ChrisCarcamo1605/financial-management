import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.error_description || err.msg || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-vh-100 d-flex" style={{ background: isDark ? '#020617' : '#f8fafc' }}>
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

      {/* Left Panel - Decorative */}
      <Col
        lg={6}
        className="d-none d-lg-flex align-items-center justify-content-center p-5 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
          color: 'white',
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            opacity: 0.1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'var(--gradient-success)',
            opacity: 0.08,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            borderRadius: 'var(--radius-2xl)',
            background: 'var(--gradient-danger)',
            opacity: 0.05,
            rotate: '45deg',
          }}
        />

        <div className="text-center position-relative" style={{ zIndex: 1 }}>
          <div
            className="mb-4 mx-auto d-flex align-items-center justify-content-center animate-float"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: 'var(--radius-2xl)',
              background: 'var(--gradient-primary)',
              fontSize: '3rem',
              boxShadow: '0 20px 60px rgba(51, 141, 252, 0.4)',
            }}
          >
            <i className="bi bi-wallet2"></i>
          </div>

          <h1 className="mb-3 text-white" style={{ fontWeight: 800, fontSize: '3rem' }}>
            FinanceApp
          </h1>
          <p className="mb-5" style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '400px', margin: '0 auto', color: 'white' }}>
            Toma el control de tus finanzas personales de forma simple y efectiva
          </p>

          {/* Features */}
          <div className="text-start mx-auto" style={{ maxWidth: '350px' }}>
            {[
              { icon: 'speedometer2', text: 'Dashboard intuitivo' },
              { icon: 'graph-up', text: 'Análisis avanzados' },
              { icon: 'shield-check', text: 'Seguridad garantizada' },
            ].map((feature, idx) => (
              <div key={idx} className="d-flex align-items-center gap-3 mb-3">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                    color: 'white',
                  }}
                >
                  <i className={`bi bi-${feature.icon}`}></i>
                </div>
                <span style={{ fontSize: '1.0625rem', color: 'white' }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Col>

      {/* Right Panel - Form */}
      <Col lg={6} className="d-flex align-items-center justify-content-center p-4">
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
            {/* Mobile logo */}
            <div className="d-lg-none text-center mb-4">
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
              <h2 className="mt-3 mb-1" style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>FinanceApp</h2>
            </div>

            <h3 className="mb-2" style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>Bienvenido de nuevo</h3>
            <p className="mb-4" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Ingresa tus credenciales para acceder a tu cuenta</p>

            {error && (
              <Alert variant="danger" className="animate-shake">
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-500" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ padding: '0.75rem 1rem', background: isDark ? '#0f172a' : 'white', borderColor: isDark ? '#475569' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-500" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Iniciar Sesión
                  </>
                )}
              </Button>

              <div className="text-center">
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>¿No tienes cuenta? </span>
                <Link to="/register" className="text-decoration-none fw-500" style={{ color: '#338dfc' }}>
                  Regístrate aquí
                </Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </div>
  );
};

export default Login;
