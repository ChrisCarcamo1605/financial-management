import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { getBudgets, getCategories, createBudget, updateBudget, deleteBudget } from '../services/api';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        getBudgets(),
        getCategories('expense'),
      ]);
      setBudgets(budgetsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving budget');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      try {
        await deleteBudget(id);
        fetchData();
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
    return period === 'monthly' ? 'Mensual' : 'Semanal';
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="bi bi-pie-chart me-2"></i>
              Presupuestos
            </h2>
            <Button variant="primary" onClick={() => handleShow()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Presupuesto
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        {budgets.map((budget) => (
          <Col key={budget.id} md={6} className="mb-3">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <Card.Title>{budget.category_name}</Card.Title>
                    <Badge bg="info" className="me-2">
                      {getPeriodLabel(budget.period)}
                    </Badge>
                    <small className="text-muted">
                      {new Date(budget.start_date).toLocaleDateString('es-ES')} - {new Date(budget.end_date).toLocaleDateString('es-ES')}
                    </small>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleShow(budget)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(budget.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Gastado: {formatCurrency(budget.spent)}</span>
                    <span className={budget.percentage > 90 ? 'text-danger' : 'text-success'}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar
                    now={budget.percentage}
                    variant={budget.percentage > 90 ? 'danger' : budget.percentage > 70 ? 'warning' : 'success'}
                    label={`${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}`}
                  />
                </div>

                <div className="d-flex justify-content-between">
                  <small className="text-muted">
                    Presupuesto: {formatCurrency(budget.amount)}
                  </small>
                  <small className={budget.remaining >= 0 ? 'text-success' : 'text-danger'}>
                    {budget.remaining >= 0 ? 'Restante: ' : 'Excedido: '}
                    {formatCurrency(Math.abs(budget.remaining))}
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {budgets.length === 0 && !loading && (
        <Row>
          <Col>
            <Card>
              <Card.Body className="text-center py-5">
                <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                <p className="mt-2 text-muted">No hay presupuestos registrados</p>
                <Button variant="primary" onClick={() => handleShow()}>
                  Crear Primer Presupuesto
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      )}

      <Modal show={showModal} onHide={handleClose} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
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
                    {categories.map((cat) => (
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
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
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
