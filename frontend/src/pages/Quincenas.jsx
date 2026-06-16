import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Badge } from 'react-bootstrap';
import { getQuincenas } from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState, Icon } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const Quincenas = () => {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => { fetchData(month); }, [month]);

  const fetchData = async (m) => {
    setLoading(true);
    try {
      const res = await getQuincenas({ month: m });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error loading quincenas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const hasData = data && (data.totals.income > 0 || data.totals.expenses > 0);

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Quincenas"
        subtitle="Gastos y disponibilidad de cada quincena (1-15 y 16-fin)"
        icon="calendar2-week"
        actions={
          <Form.Control type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            style={{ maxWidth: '180px' }} />
        }
      />

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
        </div>
      )}

      {loading ? (
        <Row>{[1, 2].map((i) => (
          <Col key={i} md={6} className="mb-3"><LoadingSkeleton type="card" count={1} /></Col>
        ))}</Row>
      ) : data ? (
        <>
          {/* Resumen del mes */}
          <Row className="mb-3">
            <Col md={3} className="mb-2">
              <Card><Card.Body>
                <p style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>Ingreso del mes</p>
                <p className="mono fw-bold mb-0" style={{ fontSize: '1.5rem', color: isDark ? '#34d399' : '#059669' }}>{formatCurrency(data.totals.income)}</p>
              </Card.Body></Card>
            </Col>
            <Col md={3} className="mb-2">
              <Card><Card.Body>
                <p style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>Préstamos del mes</p>
                <p className="mono fw-bold mb-0" style={{ fontSize: '1.5rem', color: isDark ? '#fb7185' : '#e11d48' }}>{formatCurrency(data.quincenas.reduce((s, q) => s + q.payments.reduce((a, p) => a + p.amount, 0), 0))}</p>
              </Card.Body></Card>
            </Col>
            <Col md={3} className="mb-2">
              <Card><Card.Body>
                <p style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>Servicios fijos</p>
                <p className="mono fw-bold mb-0" style={{ fontSize: '1.5rem', color: isDark ? '#fb923c' : '#ea580c' }}>{formatCurrency(data.quincenas.reduce((s, q) => s + (q.services || []).reduce((a, x) => a + x.amount, 0), 0))}</p>
              </Card.Body></Card>
            </Col>
            <Col md={3} className="mb-2">
              <Card><Card.Body>
                <p style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>Disponible</p>
                <p className="mono fw-bold mb-0" style={{
                  fontSize: '1.5rem',
                  color: data.totals.available >= 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#fb7185' : '#e11d48'),
                }}>{formatCurrency(data.totals.available)}</p>
              </Card.Body></Card>
            </Col>
          </Row>

          {/* Tarjetas por quincena */}
          <Row>
            {data.quincenas.map((q) => {
              const services = q.services || [];
              const loanExpenses = q.payments.reduce((s, p) => s + p.amount, 0);
              const servicesExpenses = services.reduce((s, x) => s + x.amount, 0);
              return (
              <Col key={q.label} md={6} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    {/* Header: quincena label + disponible destacado */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <Card.Title className="mb-0" style={{ fontWeight: 600 }}>{q.label}</Card.Title>
                      <div className="text-end">
                        <div style={{ fontSize: '0.6875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 2 }}>
                          Disponible
                        </div>
                        <div className="mono fw-bold" style={{
                          fontSize: '1.625rem',
                          lineHeight: 1,
                          color: q.available >= 0
                            ? (isDark ? '#34d399' : '#059669')
                            : (isDark ? '#fb7185' : '#e11d48'),
                        }}>
                          {formatCurrency(q.available)}
                        </div>
                      </div>
                    </div>

                    {/* Ingreso / Préstamos */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Ingreso</span>
                      <span className="mono" style={{ fontSize: '0.875rem', color: isDark ? '#34d399' : '#059669' }}>{formatCurrency(q.income)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Préstamos</span>
                      <span className="mono" style={{ fontSize: '0.875rem', color: isDark ? '#fb7185' : '#e11d48' }}>-{formatCurrency(loanExpenses)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Servicios fijos</span>
                      <span className="mono" style={{ fontSize: '0.875rem', color: isDark ? '#fb7185' : '#e11d48' }}>-{formatCurrency(servicesExpenses)}</span>
                    </div>

                    {/* Lista de pagos */}
                    {q.payments.length > 0 ? (
                      <>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8 }}>
                          Pagos en esta quincena
                        </p>
                        {q.payments.map((p) => (
                          <div key={p.id} className="d-flex justify-content-between align-items-center py-2"
                            style={{ borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: 32, height: 32, borderRadius: 'var(--radius-lg)',
                                  background: isDark ? 'rgba(251,113,133,0.15)' : 'rgba(225,29,72,0.1)',
                                  color: isDark ? '#fb7185' : '#e11d48', fontSize: '0.9375rem',
                                }}>
                                <i className="bi bi-cash-coin"></i>
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{p.loan_name}</div>
                                <small style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Cuota #{p.installment_number} · {p.due_date}</small>
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="mono" style={{ fontSize: '0.875rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{formatCurrency(p.amount)}</div>
                              <span style={{
                                display: 'inline-block',
                                marginTop: 2,
                                padding: '1px 7px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                backgroundColor: p.status === 'paid'
                                  ? (isDark ? 'rgba(52,211,153,0.15)' : '#d1fae5')
                                  : (isDark ? 'rgba(148,163,184,0.15)' : '#f1f5f9'),
                                color: p.status === 'paid'
                                  ? (isDark ? '#34d399' : '#059669')
                                  : (isDark ? '#94a3b8' : '#64748b'),
                              }}>
                                {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p style={{ textAlign: 'center', fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: services.length ? 12 : 0 }}>
                        Sin pagos en esta quincena
                      </p>
                    )}

                    {/* Servicios fijos de la quincena */}
                    {services.length > 0 && (
                      <>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, marginTop: 12 }}>
                          Servicios fijos
                        </p>
                        {services.map((s) => (
                          <div key={s.id} className="d-flex justify-content-between align-items-center py-2"
                            style={{ borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: 32, height: 32, borderRadius: 'var(--radius-lg)',
                                  background: isDark ? 'rgba(51,141,252,0.15)' : 'rgba(51,141,252,0.1)',
                                  color: '#338dfc', fontSize: '0.9375rem',
                                }}>
                                <Icon icon={s.icon} iconType={s.iconType} fallback="arrow-repeat"
                                  size={s.iconType === 'svg' ? '1rem' : undefined} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{s.name}</div>
                                <small style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Día {s.day}</small>
                              </div>
                            </div>
                            <div className="mono" style={{ fontSize: '0.875rem', color: isDark ? '#fb7185' : '#e11d48' }}>
                              -{formatCurrency(s.amount)}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              );
            })}
          </Row>

          {!hasData && (
            <EmptyState
              icon="calendar2-week"
              title="Sin movimientos este mes"
              description="Agrega fuentes de ingreso y préstamos para ver el desglose por quincena"
            />
          )}
        </>
      ) : null}
    </Container>
  );
};

export default Quincenas;
