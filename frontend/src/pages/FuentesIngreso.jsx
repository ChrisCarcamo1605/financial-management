import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import {
  getIncomeSources, createIncomeSource, updateIncomeSource, deleteIncomeSource, previewIncomeSource,
} from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

const MODALITY_LABELS = {
  planilla: 'Planilla',
  servicios_profesionales: 'Servicios profesionales',
  pension: 'Pensión',
};

const emptyForm = {
  name: '',
  modality: 'planilla',
  gross_amount: '',
  pay_schedule: 'monthly',
  pay_day: 30,
  currency: 'USD',
};

const FuentesIngreso = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const inputStyle = {
    background: isDark ? '#0f172a' : 'white',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  const labelStyle = { color: isDark ? '#e2e8f0' : '#334155' };
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const dangerColor = isDark ? '#fb7185' : '#e11d48';
  const successColor = isDark ? '#34d399' : '#059669';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getIncomeSources({ page: 1, per_page: 100 });
      setSources(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setError('Error loading income sources: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showModal) return;
    const gross = parseFloat(formData.gross_amount);
    if (!gross || gross <= 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    previewIncomeSource({ gross_amount: gross, modality: formData.modality })
      .then((res) => { if (!cancelled) setPreview(res.data); })
      .catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [formData.gross_amount, formData.modality, showModal]);

  const handleShow = (source = null) => {
    if (source) {
      setEditing(source);
      setFormData({
        name: source.name,
        modality: source.modality,
        gross_amount: source.gross_amount,
        pay_schedule: source.pay_schedule,
        pay_day: source.pay_day ?? 30,
        currency: source.currency,
      });
    } else {
      setEditing(null);
      setFormData(emptyForm);
    }
    setPreview(null);
    setError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...formData,
      gross_amount: parseFloat(formData.gross_amount),
      pay_day: formData.pay_schedule === 'monthly' ? parseInt(formData.pay_day, 10) : null,
    };
    try {
      if (editing) {
        await updateIncomeSource(editing.id, payload);
      } else {
        await createIncomeSource(payload);
      }
      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving income source');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta fuente de ingreso?')) {
      try {
        await deleteIncomeSource(id);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error deleting income source');
      }
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Fuentes de Ingreso"
        subtitle="Tu salario neto después de descuentos (ISSS, AFP, ISR)"
        icon="cash-stack"
        actions={
          <Button variant="primary" onClick={() => handleShow()}>
            <i className="bi bi-plus-circle me-2"></i>
            Nueva Fuente
          </Button>
        }
      />

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {loading ? (
        <Row>
          {[1, 2].map((i) => (
            <Col key={i} md={6} className="mb-3"><LoadingSkeleton type="card" count={1} /></Col>
          ))}
        </Row>
      ) : sources.length > 0 ? (
        <Row>
          {sources.map((s, idx) => (
            <Col key={s.id} md={6} className="mb-3">
              <Card className="animate-fade-in-up h-100" style={{
                animationDelay: `${idx * 0.1}s`,
                background: isDark ? '#1e293b' : 'white',
                borderColor: isDark ? '#334155' : 'transparent',
              }}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <Card.Title className="mb-1" style={{ fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a' }}>{s.name}</Card.Title>
                      <Badge bg="transparent" style={{
                        color: isDark ? '#93c5fd' : 'var(--primary-600)',
                        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'var(--primary-50)',
                        fontWeight: 500, padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)',
                        fontSize: '0.6875rem',
                      }}>
                        {MODALITY_LABELS[s.modality]} · {s.pay_schedule === 'biweekly' ? 'Quincenal' : `Mensual (día ${s.pay_day || '-'})`}
                      </Badge>
                    </div>
                    <div className="d-flex gap-1">
                      <Button variant="light" size="sm" className="p-2" onClick={() => handleShow(s)}
                        style={{ borderRadius: 'var(--radius-md)', background: isDark ? '#334155' : 'transparent', color: isDark ? '#cbd5e1' : 'var(--primary-600)', border: 'none' }}>
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button variant="light" size="sm" className="p-2 text-danger" onClick={() => handleDelete(s.id)}
                        style={{ borderRadius: 'var(--radius-md)', background: isDark ? '#334155' : 'transparent', color: isDark ? '#fda4af' : 'var(--danger-500)', border: 'none' }}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: mutedColor }}>Salario bruto</span>
                    <span className="mono" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{formatCurrency(s.gross_amount)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: '0.875rem', color: mutedColor }}>ISSS</span>
                    <span className="mono" style={{ fontSize: '0.875rem', color: dangerColor }}>-{formatCurrency(s.isss)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: '0.875rem', color: mutedColor }}>AFP</span>
                    <span className="mono" style={{ fontSize: '0.875rem', color: dangerColor }}>-{formatCurrency(s.afp)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span style={{ fontSize: '0.875rem', color: mutedColor }}>ISR</span>
                    <span className="mono" style={{ fontSize: '0.875rem', color: dangerColor }}>-{formatCurrency(s.isr)}</span>
                  </div>
                  <hr className="my-2" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a' }}>Salario neto</span>
                    <span className="mono fw-bold" style={{ fontSize: '1.25rem', color: successColor }}>
                      {formatCurrency(s.net_amount)}
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          icon="cash-stack"
          title="No hay fuentes de ingreso"
          description="Agrega tu salario para calcular cuánto se va en préstamos"
          actionLabel="Nueva Fuente"
          onAction={() => handleShow()}
        />
      )}

      <Modal show={showModal} onHide={handleClose} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton style={{
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}>
            <Modal.Title style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: 600 }}>
              {editing ? 'Editar Fuente' : 'Nueva Fuente de Ingreso'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: isDark ? '#1e293b' : 'white' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label style={labelStyle}>Nombre</Form.Label>
              <Form.Control type="text" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Salario Empresa X" required style={inputStyle} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>Modalidad</Form.Label>
                  <Form.Select value={formData.modality}
                    onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                    style={inputStyle}>
                    <option value="planilla">Planilla</option>
                    <option value="servicios_profesionales">Servicios profesionales</option>
                    <option value="pension">Pensión</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>Salario bruto mensual</Form.Label>
                  <Form.Control type="number" step="0.01" value={formData.gross_amount}
                    onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                    placeholder="0.00" required style={inputStyle} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={labelStyle}>Frecuencia de pago</Form.Label>
                  <Form.Select value={formData.pay_schedule}
                    onChange={(e) => setFormData({ ...formData, pay_schedule: e.target.value })}
                    style={inputStyle}>
                    <option value="monthly">Mensual</option>
                    <option value="biweekly">Quincenal</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              {formData.pay_schedule === 'monthly' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Día de cobro</Form.Label>
                    <Form.Control type="number" min="1" max="31" value={formData.pay_day}
                      onChange={(e) => setFormData({ ...formData, pay_day: e.target.value })}
                      style={inputStyle} />
                  </Form.Group>
                </Col>
              )}
            </Row>

            {preview && (
              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: 'var(--radius-lg)', padding: '1rem', marginTop: '0.5rem',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}>
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: mutedColor }}>ISSS</span>
                  <span className="mono" style={{ color: dangerColor }}>-{formatCurrency(preview.isss)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: mutedColor }}>AFP</span>
                  <span className="mono" style={{ color: dangerColor }}>-{formatCurrency(preview.afp)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: mutedColor }}>ISR</span>
                  <span className="mono" style={{ color: dangerColor }}>-{formatCurrency(preview.isr)}</span>
                </div>
                <hr className="my-2" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                <div className="d-flex justify-content-between">
                  <span style={{ fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a' }}>Neto estimado</span>
                  <span className="mono fw-bold" style={{ color: successColor }}>{formatCurrency(preview.net)}</span>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer style={{
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}>
            <Button variant="light" onClick={handleClose}
              style={isDark ? { background: '#334155', color: '#f1f5f9', border: 'none' } : {}}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">{editing ? 'Actualizar' : 'Crear'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default FuentesIngreso;