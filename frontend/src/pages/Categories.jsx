import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge, Nav } from 'react-bootstrap';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#0d6efd',
    icon: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShow = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color || '#0d6efd',
        icon: category.icon || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'expense', color: '#0d6efd', icon: '' });
    }
    setError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      fetchCategories();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await deleteCategory(id);
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const filteredCategories =
    activeTab === 'all'
      ? categories
      : categories.filter((cat) => cat.type === activeTab);

  const incomeCount = categories.filter((c) => c.type === 'income').length;
  const expenseCount = categories.filter((c) => c.type === 'expense').length;

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="bi bi-tags me-2"></i>
              Categorías
            </h2>
            <Button variant="primary" onClick={() => handleShow()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nueva Categoría
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Nav variant="tabs" defaultActiveKey="all">
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'all'}
                    onClick={() => setActiveTab('all')}
                  >
                    Todas ({categories.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'income'}
                    onClick={() => setActiveTab('income')}
                  >
                    <i className="bi bi-arrow-up-circle text-success me-1"></i>
                    Ingresos ({incomeCount})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'expense'}
                    onClick={() => setActiveTab('expense')}
                  >
                    <i className="bi bi-arrow-down-circle text-danger me-1"></i>
                    Gastos ({expenseCount})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {filteredCategories.map((category) => (
          <Col key={category.id} md={3} className="mb-3">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center">
                    {category.color && (
                      <div
                        className="me-3"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: category.color,
                        }}
                      ></div>
                    )}
                    <div>
                      <Card.Title className="mb-1">{category.name}</Card.Title>
                      <Badge bg={category.type === 'income' ? 'success' : 'danger'}>
                        {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleShow(category)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </div>
                {category.icon && (
                  <Card.Text className="text-muted mt-2">
                    <i className={`bi bi-${category.icon} me-1`}></i>
                    {category.icon}
                  </Card.Text>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {filteredCategories.length === 0 && !loading && (
        <Row>
          <Col>
            <Card>
              <Card.Body className="text-center py-5">
                <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                <p className="mt-2 text-muted">No hay categorías</p>
                <Button variant="primary" onClick={() => handleShow()}>
                  Crear Primera Categoría
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

      <Modal show={showModal} onHide={handleClose}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Alimentación"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo</Form.Label>
              <Form.Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Color</Form.Label>
              <Form.Control
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Icono (Bootstrap Icon name)</Form.Label>
              <Form.Control
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Ej: cart, house, car"
              />
              <Form.Text className="text-muted">
                Nombres de iconos: https://icons.getbootstrap.com
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingCategory ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Categories;
