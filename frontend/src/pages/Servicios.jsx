import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import {
  getRecurringServices, createRecurringService, updateRecurringService,
  deleteRecurringService, generateRecurringTransactions,
  getCategories, getAccounts,
} from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState, Icon } from '../components/ui';
import IconPicker from '../components/ui/IconPicker';
import { useTheme } from '../context/ThemeContext';

const emptyForm = {
  name: '',
  amount: '',
  day_of_month: 1,
  category_id: '',
  account_id: '',
  active: true,
  icon: '',
  iconType: 'bootstrap',
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const Servicios = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState(monthKey(new Date()));
  const [generating, setGenerating] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const muted = isDark ? '#94a3b8' : '#64748b';
  const inputStyle = {
    background: isDark ? '#0f172a' : 'white',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes, accountsRes] = await Promise.all([
        getRecurringServices({ page: 1, per_page: 100 }),
        getCategories({ type: 'expense', page: 1, per_page: 200 }),
        getAccounts({ page: 1, per_page: 100 }),
      ]);
      setServices(Array.isArray(servicesRes.data.data) ? servicesRes.data.data : []);
      setCategories(Array.isArray(categoriesRes.data.data) ? categoriesRes.data.data : []);
      setAccounts(Array.isArray(accountsRes.data.data) ? accountsRes.data.data : []);
    } catch (err) {
      setError('Error cargando servicios: ' + (err.message || 'desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleShow = (service = null) => {
    if (service) {
      setEditing(service);
      setFormData({
        name: service.name,
        amount: service.amount,
        day_of_month: service.day_of_month,
        category_id: service.category_id || '',
        account_id: service.account_id || '',
        active: service.active,
        icon: service.icon || '',
        iconType: service.iconType || 'bootstrap',
      });
    } else {
      setEditing(null);
      setFormData(emptyForm);
    }
    setError('');
    setShowModal(true);
  };

  const handleClose = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      day_of_month: parseInt(formData.day_of_month, 10),
      category_id: formData.category_id || null,
      account_id: formData.account_id || null,
    };
    try {
      if (editing) {
        await updateRecurringService(editing.id, payload);
      } else {
        await createRecurringService(payload);
      }
      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando servicio');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este servicio? Las transacciones ya generadas se conservan.')) {
      try {
        await deleteRecurringService(id);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error eliminando servicio');
      }
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setNotice('');
    setError('');
    try {
      const res = await generateRecurringTransactions({ month });
      const created = res.data.created?.length || 0;
      const skipped = res.data.skipped?.length || 0;
      setNotice(`Generadas ${created} transacción(es). ${skipped} omitida(s) (ya existían o sin categoría/cuenta).`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error generando transacciones');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const monthlyTotal = services
    .filter((s) => s.active)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Servicios Recurrentes"
        subtitle="Gastos fijos que pagas cada mes (suscripciones, luz, agua, internet)"
        icon="arrow-repeat"
        actions={
          <Button variant="primary" onClick={() => handleShow()}>
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Servicio
          </Button>
        }
      />

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success mb-4">
          <i className="bi bi-check-circle me-2"></i>{notice}
        </div>
      )}

      {/* Generar transacciones del mes */}
      <Card className="mb-4">
        <Card.Body className="d-flex flex-wrap align-items-center gap-3 justify-content-between">
          <div>
            <div style={{ fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a' }}>Total mensual activo</div>
            <div className="mono fw-bold" style={{ fontSize: '1.375rem', color: isDark ? '#fb7185' : '#e11d48' }}>
              {formatCurrency(monthlyTotal)}
            </div>
          </div>
          <div className="d-flex align-items-end gap-2 flex-wrap">
            <div>
              <Form.Label style={{ fontSize: '0.75rem', color: muted, marginBottom: 2 }}>Mes a generar</Form.Label>
              <Form.Control type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                style={{ ...inputStyle, maxWidth: '170px' }} />
            </div>
            <Button variant="outline-primary" onClick={handleGenerate} disabled={generating}>
              <i className="bi bi-magic me-2"></i>
              {generating ? 'Generando...' : 'Generar transacciones'}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {loading ? (
        <Row>
          {[1, 2, 3].map((i) => (
            <Col key={i} md={4} className="mb-3"><LoadingSkeleton type="card" count={1} /></Col>
          ))}
        </Row>
      ) : services.length > 0 ? (
        <Row>
          {services.map((s, idx) => (
            <Col key={s.id} md={4} sm={6} className="mb-3">
              <Card className="animate-fade-in-up h-100" style={{ animationDelay: `${idx * 0.06}s` }}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 46, height: 46, borderRadius: 'var(--radius-lg)',
                          background: isDark ? 'rgba(51,141,252,0.15)' : 'rgba(51,141,252,0.1)',
                          color: '#338dfc', fontSize: '1.25rem',
                        }}>
                        <Icon icon={s.icon} iconType={s.iconType} fallback="arrow-repeat"
                          size={s.iconType === 'svg' ? '1.4rem' : undefined} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Card.Title className="mb-1 text-truncate" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                          {s.name}
                        </Card.Title>
                        <Badge bg={s.active ? 'transparent' : 'transparent'} style={{
                          color: s.active ? (isDark ? '#34d399' : '#059669') : muted,
                          backgroundColor: s.active
                            ? (isDark ? 'rgba(52,211,153,0.15)' : '#d1fae5')
                            : (isDark ? 'rgba(148,163,184,0.15)' : '#f1f5f9'),
                          fontWeight: 600, fontSize: '0.6875rem', borderRadius: 'var(--radius-full)',
                          padding: '0.2rem 0.6rem',
                        }}>
                          {s.active ? 'Activo' : 'Pausado'}
                        </Badge>
                      </div>
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      <Button variant="light" size="sm" className="p-2" onClick={() => handleShow(s)}
                        style={{ borderRadius: 'var(--radius-md)' }}><i className="bi bi-pencil"></i></Button>
                      <Button variant="light" size="sm" className="p-2 text-danger" onClick={() => handleDelete(s.id)}
                        style={{ borderRadius: 'var(--radius-md)' }}><i className="bi bi-trash"></i></Button>
                    </div>
                  </div>

                  <div className="mono fw-bold mb-2" style={{ fontSize: '1.5rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                    {formatCurrency(s.amount)}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: muted }}> /mes</span>
                  </div>

                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: '0.8125rem', color: muted }}>Día de cobro</span>
                    <span style={{ fontSize: '0.8125rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>Día {s.day_of_month}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: '0.8125rem', color: muted }}>Categoría</span>
                    <span style={{ fontSize: '0.8125rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{s.category_name || '—'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span style={{ fontSize: '0.8125rem', color: muted }}>Cuenta</span>
                    <span style={{ fontSize: '0.8125rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{s.account_name || '—'}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          icon="arrow-repeat"
          title="No hay servicios recurrentes"
          description="Agrega tus suscripciones y servicios fijos para verlos como gasto mensual y en Quincenas"
          actionLabel="Nuevo Servicio"
          onAction={() => handleShow()}
        />
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={handleClose} centered size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton style={{
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}>
            <Modal.Title style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: 600 }}>
              {editing ? 'Editar Servicio' : 'Nuevo Servicio Recurrente'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: isDark ? '#1e293b' : 'white' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control type="text" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Netflix, Luz, Internet..." required style={inputStyle} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Monto mensual</Form.Label>
                  <Form.Control type="number" step="0.01" value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00" required style={inputStyle} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Día de cobro</Form.Label>
                  <Form.Control type="number" min="1" max="31" value={formData.day_of_month}
                    onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                    required style={inputStyle} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoría (gasto)</Form.Label>
                  <Form.Select value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    style={inputStyle}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cuenta</Form.Label>
                  <Form.Select value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    style={inputStyle}>
                    <option value="">Sin cuenta</option>
                    {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <p style={{ fontSize: '0.75rem', color: muted, marginTop: '-0.5rem' }}>
              Necesitas categoría y cuenta para que "Generar transacciones" cree el gasto automáticamente.
            </p>

            <Form.Check
              type="switch"
              id="service-active"
              label="Activo"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mb-3"
            />

            <Form.Group className="mb-2">
              <Form.Label>Icono</Form.Label>
              <IconPicker
                selectedIcon={formData.icon}
                selectedType={formData.iconType}
                onIconSelect={(icon, iconType) => setFormData({ ...formData, icon, iconType })}
              />
            </Form.Group>
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

export default Servicios;
