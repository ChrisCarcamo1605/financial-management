import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { getBudgets, getCategories, createBudget, updateBudget, deleteBudget } from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState, CircularProgress, Pagination } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    period: 'monthly',
    start_date: '',
    end_date: '',
  });
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 20;

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        getBudgets({ page, per_page: perPage }),
        getCategories({ type: 'expense', page: 1, per_page: 200 }),
      ]);
      console.log('Budgets loaded:', budgetsRes.data);
      setBudgets(Array.isArray(budgetsRes.data.data) ? budgetsRes.data.data : []);
      setTotalPages(budgetsRes.data.total_pages || 0);
      setTotalItems(budgetsRes.data.total || 0);
      setCategories(Array.isArray(categoriesRes.data.data) ? categoriesRes.data.data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error loading budgets: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleShow = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        category_id: budget.category_id,
        amount: budget.amount,
        period: budget.period,
        start_date: budget.start_date,
        end_date: budget.end_date,
      });
    } else {
      setEditingBudget(null);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFormData({
        category_id: '',
        amount: '',
        period: 'monthly',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingBudget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, formData);
      } else {
        await createBudget(formData);
      }
      fetchData(currentPage);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving budget');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      try {
        await deleteBudget(id);
        fetchData(currentPage);
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPeriodLabel = (period) => {
    return period === 'monthly' ? '/mes' : '/sem';
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Presupuestos"
        subtitle="Controla tus límites de gasto"
        icon="pie-chart"
        actions={
          <Button variant="primary" onClick={() => handleShow()}>
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Presupuesto
          </Button>
        }
      />

      {error && (
        <div className="alert alert-danger animate-shake mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {loading ? (
        <Row>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} md={6} className="mb-3">
              <LoadingSkeleton type="card" count={1} />
            </Col>
          ))}
        </Row>
      ) : budgets.length > 0 ? (
        <Row>
          {Array.isArray(budgets) && budgets.map((budget, idx) => (
            <Col key={budget.id} md={6} className="mb-3">
              <Card
                className="animate-fade-in-up h-100"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <Card.Body>
                  <div className="d-flex align-items-start gap-4">
                    {/* Circular Progress */}
                    <CircularProgress
                      value={typeof budget.percentage === 'number' ? budget.percentage : 0}
                      size={90}
                      strokeWidth={10}
                      color="auto"
                    />

                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <Card.Title className="mb-1" style={{ fontWeight: 600 }}>
                            {budget.category_name}
                          </Card.Title>
                          <Badge 
                            bg="transparent"
                            style={{
                              color: 'var(--primary-600)',
                              backgroundColor: 'var(--primary-50)',
                              fontWeight: 500,
                              padding: '0.25rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.6875rem',
                            }}
                          >
                            {getPeriodLabel(budget.period)}
                          </Badge>
                        </div>
                        
                        <div className="d-flex gap-1">
                          <Button
                            variant="light"
                            size="sm"
                            className="p-2"
                            onClick={() => handleShow(budget)}
                            style={{ borderRadius: 'var(--radius-md)' }}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="light"
                            size="sm"
                            className="p-2 text-danger"
                            onClick={() => handleDelete(budget.id)}
                            style={{ borderRadius: 'var(--radius-md)' }}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </div>

                      {/* Progress details */}
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div>
                          <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                            Gastado
                          </p>
                          <p className="mb-0 mono fw-bold" style={{ fontSize: '1.125rem' }}>
                            {formatCurrency(budget.spent)}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                            Presupuesto
                          </p>
                          <p className="mb-0 mono" style={{ fontSize: '1.125rem', color: 'var(--slate-500)' }}>
                            {formatCurrency(budget.amount)}
                          </p>
                        </div>
                      </div>

                      {/* Remaining */}
                      <div className="mt-2">
                        <small 
                          className={budget.remaining >= 0 ? 'text-success' : 'text-danger'}
                          style={{ fontWeight: 500 }}
                        >
                          {budget.remaining >= 0 ? '✓ Restante: ' : '⚠ Excedido: '}
                          {formatCurrency(Math.abs(budget.remaining))}
                        </small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          icon="pie-chart"
          title="No hay presupuestos"
          description="Crea tu primer presupuesto para controlar tus gastos"
          actionLabel="Nuevo Presupuesto"
          onAction={() => handleShow()}
        />
      )}

      {/* Pagination */}
      {!loading && budgets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          perPage={perPage}
        />
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={handleClose} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton style={{ 
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}>
            <Modal.Title style={{ 
              color: isDark ? '#f1f5f9' : '#0f172a',
              fontWeight: 600
            }}>
              {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ 
            backgroundColor: isDark ? '#1e293b' : 'white'
          }}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {Array.isArray(categories) && categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Monto</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Período</Form.Label>
                  <Form.Select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  >
                    <option value="monthly">Mensual</option>
                    <option value="weekly">Semanal</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha Inicio</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha Fin</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ 
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}>
            <Button variant="light" onClick={handleClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingBudget ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Budgets;
