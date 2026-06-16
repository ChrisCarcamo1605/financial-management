import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge, ProgressBar } from 'react-bootstrap';
import {
  getLoans, createLoan, updateLoan, deleteLoan, toggleLoanPayment, getIncomeSources,
} from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

const emptyForm = {
  name: '',
  principal: '',
  interest_rate: '0',
  interest_method: 'simple',
  payment_type: 'monthly',
  installments: '12',
  payment_day: 30,
  start_date: '',
  income_source_id: '',
};

const Prestamos = () => {
  const [loans, setLoans] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loansRes, sourcesRes] = await Promise.all([
        getLoans({ page: 1, per_page: 50 }),
        getIncomeSources({ page: 1, per_page: 100 }),
      ]);
      setLoans(Array.isArray(loansRes.data.data) ? loansRes.data.data : []);
      setSources(Array.isArray(sourcesRes.data.data) ? sourcesRes.data.data : []);
    } catch (err) {
      setError('Error loading loans: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleShow = (loan = null) => {
    if (loan) {
      setEditing(loan);
      setFormData({
        name: loan.name,
        principal: loan.principal,
        interest_rate: String(loan.interest_rate),
        interest_method: loan.interest_method,
        payment_type: loan.payment_type,
        installments: String(loan.installments || 1),
        payment_day: loan.payment_day ?? 30,
        start_date: loan.start_date,
        income_source_id: loan.income_source_id,
      });
    } else {
      setEditing(null);
      setFormData({ ...emptyForm, start_date: new Date().toISOString().split('T')[0] });
    }
    setError('');
    setShowModal(true);
  };

  const handleClose = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.income_source_id) {
      setError('Selecciona una fuente de ingreso');
      return;
    }
    const payload = {
      name: formData.name,
      principal: parseFloat(formData.principal),
      interest_rate: parseFloat(formData.interest_rate) || 0,
      interest_method: formData.interest_method,
      payment_type: formData.payment_type,
      installments: formData.payment_type === 'monthly' ? parseInt(formData.installments, 10) : 1,
      payment_day: formData.payment_type === 'monthly' ? parseInt(formData.payment_day, 10) : null,
      start_date: formData.start_date,
      income_source_id: parseInt(formData.income_source_id, 10),
    };
    try {
      if (editing) {
        await updateLoan(editing.id, payload);
      } else {
        await createLoan(payload);
      }
      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving loan');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este préstamo y todas sus cuotas?')) {
      try {
        await deleteLoan(id);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error deleting loan');
      }
    }
  };

  const handleTogglePayment = async (paymentId) => {
    try {
      await toggleLoanPayment(paymentId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating payment');
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Préstamos"
        subtitle="Créditos y cuotas, y de qué ingreso se pagan"
        icon="credit-card"
        actions={
          <Button variant="primary" onClick={() => handleShow()} disabled={sources.length === 0}>
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Préstamo
          </Button>
        }
      />

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
        </div>
      )}

      {sources.length === 0 && !loading && (
        <Alert variant="info">
          Primero crea una <strong>fuente de ingreso</strong> para poder asignar préstamos.
        </Alert>
      )}

      {loading ? (
        <Row>{[1, 2].map((i) => (
          <Col key={i} md={6} className="mb-3"><LoadingSkeleton type="card" count={1} /></Col>
        ))}</Row>
      ) : loans.length > 0 ? (
        <Row>
          {loans.map((loan, idx) => {
            const pct = loan.total_amount > 0 ? (loan.total_paid / loan.total_amount) * 100 : 0;
            const isOpen = expanded === loan.id;
            return (
              <Col key={loan.id} md={6} className="mb-3">
                <Card className="animate-fade-in-up h-100" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <Card.Title className="mb-1" style={{ fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a' }}>{loan.name}</Card.Title>
                        <div className="d-flex gap-1 flex-wrap">
                          <Badge bg="transparent" style={{
                            color: 'var(--primary-600)', backgroundColor: 'var(--primary-50)',
                            fontWeight: 500, borderRadius: 'var(--radius-full)', fontSize: '0.6875rem',
                          }}>
                            {loan.payment_type === 'single' ? 'Pago único' : `${loan.installments} cuotas`}
                          </Badge>
                          <Badge bg="transparent" style={{
                            color: 'var(--slate-600)', backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : 'var(--slate-100)',
                            fontWeight: 500, borderRadius: 'var(--radius-full)', fontSize: '0.6875rem',
                          }}>
                            {Number(loan.interest_rate) === 0 ? 'Tasa cero' : `${loan.interest_rate}% ${loan.interest_method === 'french' ? 'fija' : 'simple'}`}
                          </Badge>
                          {loan.status === 'paid' && (
                            <Badge bg="success" style={{ fontSize: '0.6875rem' }}>Pagado</Badge>
                          )}
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <Button variant="light" size="sm" className="p-2" onClick={() => handleShow(loan)}
                          style={{ borderRadius: 'var(--radius-md)' }}><i className="bi bi-pencil"></i></Button>
                        <Button variant="light" size="sm" className="p-2 text-danger" onClick={() => handleDelete(loan.id)}
                          style={{ borderRadius: 'var(--radius-md)' }}><i className="bi bi-trash"></i></Button>
                      </div>
                    </div>

                    <p className="text-muted mb-2" style={{ fontSize: '0.8125rem' }}>
                      <i className="bi bi-cash-stack me-1"></i>{loan.income_source_name}
                    </p>

                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Pagado</span>
                      <span className="mono" style={{ fontSize: '0.8125rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                        {formatCurrency(loan.total_paid)} / {formatCurrency(loan.total_amount)}
                      </span>
                    </div>
                    <ProgressBar now={pct} variant={pct >= 100 ? 'success' : 'primary'}
                      style={{ height: '8px', borderRadius: 'var(--radius-full)' }} className="mb-2" />
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">Restante: <span className="mono">{formatCurrency(loan.remaining)}</span></small>
                      <Button variant="link" size="sm" className="p-0"
                        onClick={() => setExpanded(isOpen ? null : loan.id)}>
                        {isOpen ? 'Ocultar cuotas' : 'Ver cuotas'} <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="mt-3">
                        {loan.payments.map((p) => (
                          <div key={p.id} className="d-flex justify-content-between align-items-center py-1"
                            style={{ borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                            <span style={{ fontSize: '0.8125rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                              #{p.installment_number} · {p.due_date}
                            </span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="mono" style={{ fontSize: '0.8125rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{formatCurrency(p.amount)}</span>
                              <Form.Check type="checkbox" checked={p.status === 'paid'}
                                onChange={() => handleTogglePayment(p.id)}
                                title={p.status === 'paid' ? 'Marcar pendiente' : 'Marcar pagada'} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        sources.length > 0 && (
          <EmptyState
            icon="credit-card"
            title="No hay préstamos"
            description="Registra un préstamo para ver cuánto pagas cada quincena"
            actionLabel="Nuevo Préstamo"
            onAction={() => handleShow()}
          />
        )
      )}

      <Modal show={showModal} onHide={handleClose} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton style={{
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}>
            <Modal.Title style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: 600 }}>
              {editing ? 'Editar Préstamo' : 'Nuevo Préstamo'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: isDark ? '#1e293b' : 'white' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Préstamo auto, TV en cuotas..." required />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Monto (principal)</Form.Label>
                  <Form.Control type="number" step="0.01" value={formData.principal}
                    onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    placeholder="0.00" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fuente de ingreso</Form.Label>
                  <Form.Select value={formData.income_source_id}
                    onChange={(e) => setFormData({ ...formData, income_source_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {sources.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tasa de interés anual (%)</Form.Label>
                  <Form.Control type="number" step="0.01" min="0" value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    placeholder="0 = tasa cero" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Método de interés</Form.Label>
                  <Form.Select value={formData.interest_method}
                    onChange={(e) => setFormData({ ...formData, interest_method: e.target.value })}>
                    <option value="simple">Interés simple</option>
                    <option value="french">Cuota fija (francesa)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de pago</Form.Label>
                  <Form.Select value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}>
                    <option value="monthly">Cuotas mensuales</option>
                    <option value="single">Un solo pago</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              {formData.payment_type === 'monthly' ? (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nº de cuotas</Form.Label>
                    <Form.Control type="number" min="1" value={formData.installments}
                      onChange={(e) => setFormData({ ...formData, installments: e.target.value })} required />
                  </Form.Group>
                </Col>
              ) : null}
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{formData.payment_type === 'single' ? 'Fecha de pago' : 'Fecha de inicio'}</Form.Label>
                  <Form.Control type="date" value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </Form.Group>
              </Col>
              {formData.payment_type === 'monthly' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Día de pago mensual</Form.Label>
                    <Form.Control type="number" min="1" max="31" value={formData.payment_day}
                      onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })} />
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer style={{
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}>
            <Button variant="light" onClick={handleClose}>Cancelar</Button>
            <Button variant="primary" type="submit">{editing ? 'Actualizar' : 'Crear'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Prestamos;
