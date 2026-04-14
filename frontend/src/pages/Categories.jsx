import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState, Pagination } from '../components/ui';
import IconPicker from '../components/ui/IconPicker';

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
    iconType: 'bootstrap', // 'bootstrap' or 'svg'
  });
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 50;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  useEffect(() => {
    fetchCategories(currentPage);
  }, [currentPage, activeTab]);

  const fetchCategories = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      const response = await getCategories(params);
      setCategories(response.data.data);
      setTotalPages(response.data.total_pages);
      setTotalItems(response.data.total);
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
        iconType: category.iconType || 'bootstrap',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'expense', color: '#0d6efd', icon: '', iconType: 'bootstrap' });
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
      fetchCategories(currentPage);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await deleteCategory(id);
        fetchCategories(currentPage);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleIconSelect = (icon, iconType) => {
    setFormData({ ...formData, icon, iconType });
  };

  const filteredCategories =
    activeTab === 'all'
      ? (Array.isArray(categories) ? categories : [])
      : (Array.isArray(categories) ? categories.filter((cat) => cat.type === activeTab) : []);

  const incomeCount = Array.isArray(categories) ? categories.filter((c) => c.type === 'income').length : 0;
  const expenseCount = Array.isArray(categories) ? categories.filter((c) => c.type === 'expense').length : 0;

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Categorías"
        subtitle="Organiza tus ingresos y gastos"
        icon="tags"
        actions={
          <Button variant="primary" onClick={() => handleShow()}>
            <i className="bi bi-plus-circle me-2"></i>
            Nueva Categoría
          </Button>
        }
      />

      {/* Tabs - Redesigned */}
      <Card className="mb-4 animate-fade-in-up" style={{ background: isDark ? '#1e293b' : 'white' }}>
        <Card.Body className="pb-2">
          <div className="d-flex gap-2 flex-wrap" role="tablist">
            {[
              { key: 'all', label: 'Todas', count: categories.length, icon: 'bi-grid' },
              { key: 'income', label: 'Ingresos', count: incomeCount, icon: 'bi-arrow-up-circle' },
              { key: 'expense', label: 'Gastos', count: expenseCount, icon: 'bi-arrow-down-circle' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? (isDark ? '#338dfc' : '#338dfc') : 'transparent',
                    color: isActive ? 'white' : (isDark ? '#94a3b8' : '#64748b'),
                    boxShadow: isActive ? '0 2px 8px rgba(51, 141, 252, 0.3)' : 'none',
                  }}
                >
                  <i className={`bi ${tab.icon}`}></i>
                  {tab.label}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? '#334155' : '#f1f5f9'),
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      padding: '0 6px',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Category Grid */}
      {loading ? (
        <Row>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Col key={i} md={3} sm={6} className="mb-3">
              <LoadingSkeleton type="card" count={1} />
            </Col>
          ))}
        </Row>
      ) : filteredCategories.length > 0 ? (
        <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
          <Row>
          {filteredCategories.map((category, idx) => (
            <Col key={category.id} md={3} sm={6} className="mb-3">
              <Card
                className="animate-fade-in-up h-100"
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  background: isDark ? '#1e293b' : 'white',
                  borderColor: isDark ? '#334155' : 'transparent',
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
                      {/* Color swatch with icon */}
                      <div
                        className="d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: category.color,
                          color: 'white',
                          fontSize: '1.25rem',
                          boxShadow: `0 4px 12px ${category.color}40`,
                        }}
                      >
                        {category.icon ? (
                          category.iconType === 'svg' ? (
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }} dangerouslySetInnerHTML={{ __html: category.icon }} />
                          ) : (
                            <i className={`bi bi-${category.icon}`}></i>
                          )
                        ) : (
                          <i className="bi bi-tag"></i>
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Card.Title
                          className="mb-1 text-truncate"
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: isDark ? '#f1f5f9' : '#0f172a',
                          }}
                        >
                          {category.name}
                        </Card.Title>
                        <Badge
                          bg="transparent"
                          style={{
                            color: category.type === 'income'
                              ? (isDark ? '#6ee7b7' : '#047857')
                              : (isDark ? '#fda4af' : '#be123c'),
                            backgroundColor: category.type === 'income'
                              ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'var(--success-50)')
                              : (isDark ? 'rgba(244, 63, 94, 0.15)' : 'var(--danger-50)'),
                            fontWeight: 500,
                            padding: '0.25rem 0.625rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.6875rem',
                          }}
                        >
                          {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </div>
                    </div>

                    <div className="d-flex gap-1">
                      <Button
                        variant="light"
                        size="sm"
                        className="p-2"
                        onClick={() => handleShow(category)}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          background: isDark ? '#334155' : 'transparent',
                          color: isDark ? '#cbd5e1' : 'var(--primary-600)',
                          border: 'none',
                        }}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        className="p-2"
                        onClick={() => handleDelete(category.id)}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          background: isDark ? '#334155' : 'transparent',
                          color: isDark ? '#fda4af' : 'var(--danger-500)',
                          border: 'none',
                        }}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        </div>
      ) : (
        <EmptyState
          icon="tags"
          title="No hay categorías"
          description="Crea tu primera categoría para organizar mejor tus finanzas"
          actionLabel="Nueva Categoría"
          onAction={() => handleShow()}
        />
      )}

      {/* Pagination */}
      {!loading && categories.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          perPage={perPage}
        />
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={handleClose} centered size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <Modal.Title style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: isDark ? '#1e293b' : 'white' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Nombre</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Alimentación"
                    required
                    style={{ background: isDark ? '#0f172a' : 'white', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f1f5f9' : '#0f172a' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Tipo</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ background: isDark ? '#0f172a' : 'white', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f1f5f9' : '#0f172a' }}
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Color</Form.Label>
              <div className="d-flex align-items-center gap-3">
                <Form.Control
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ width: '50px', height: '40px', borderRadius: 'var(--radius-lg)' }}
                />
                <span className="mono" style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {formData.color}
                </span>
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Icono</Form.Label>
              <IconPicker
                selectedIcon={formData.icon}
                selectedType={formData.iconType}
                onIconSelect={handleIconSelect}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer style={{ 
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}>
            <Button variant="light" onClick={handleClose}>
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
