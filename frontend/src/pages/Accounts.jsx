import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/api';
import { PageHeader, LoadingSkeleton, EmptyState, Pagination } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    currency: 'USD',
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
    fetchAccounts(currentPage);
  }, [currentPage]);

  const fetchAccounts = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAccounts({ page, per_page: perPage });
      setAccounts(response.data.data);
      setTotalPages(response.data.total_pages);
      setTotalItems(response.data.total);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShow = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        balance: account.balance,
        currency: account.currency,
      });
    } else {
      setEditingAccount(null);
      setFormData({ name: '', balance: '', currency: 'USD' });
    }
    setError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingAccount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, formData);
      } else {
        await createAccount(formData);
      }
      fetchAccounts(currentPage);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving account');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta? Se eliminarán también las transacciones asociadas.')) {
      try {
        await deleteAccount(id);
        fetchAccounts(currentPage);
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const currencyIcons = {
    USD: 'currency-dollar',
    EUR: 'currency-euro',
    MXN: 'cash-coin',
    ARS: 'cash-coin',
    COP: 'cash-coin',
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Cuentas"
        subtitle="Gestiona tus cuentas bancarias"
        icon="bank"
        actions={
          <Button variant="primary" onClick={() => handleShow()}>
            <i className="bi bi-plus-circle me-2"></i>
            Nueva Cuenta
          </Button>
        }
      />

      {loading ? (
        <Row>
          {[1, 2, 3].map((i) => (
            <Col key={i} md={4} className="mb-3">
              <LoadingSkeleton type="card" count={1} />
            </Col>
          ))}
        </Row>
      ) : accounts.length > 0 ? (
        <Row>
          {Array.isArray(accounts) && accounts.map((account, idx) => (
            <Col key={account.id} md={4} sm={6} className="mb-3">
              <Card
                className="animate-fade-in-up h-100"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-lg)',
                          background: account.balance >= 0 ? 'var(--gradient-success)' : 'var(--gradient-danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1.25rem',
                          boxShadow: account.balance >= 0 
                            ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                            : '0 4px 12px rgba(244, 63, 94, 0.3)',
                        }}
                      >
                        <i className={`bi bi-${currencyIcons[account.currency] || 'wallet2'}`}></i>
                      </div>
                      <div>
                        <Card.Title className="mb-0" style={{ fontWeight: 600 }}>
                          {account.name}
                        </Card.Title>
                        <Badge
                          bg="transparent"
                          style={{
                            color: 'var(--slate-600)',
                            backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : 'var(--slate-100)',
                            fontWeight: 500,
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.6875rem',
                          }}
                        >
                          {account.currency}
                        </Badge>
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        variant="light"
                        size="sm"
                        className="p-2"
                        onClick={() => handleShow(account)}
                        style={{ borderRadius: 'var(--radius-md)' }}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        className="p-2 text-danger"
                        onClick={() => handleDelete(account.id)}
                        style={{ borderRadius: 'var(--radius-md)' }}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>

                  <hr />

                  <div className="text-end">
                    <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>Balance</p>
                    <h3 className={`mb-0 mono ${account.balance >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 700 }}>
                      {formatCurrency(account.balance)}
                    </h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          icon="bank"
          title="No hay cuentas"
          description="Agrega tu primera cuenta bancaria para comenzar"
          actionLabel="Nueva Cuenta"
          onAction={() => handleShow()}
        />
      )}

      {/* Pagination */}
      {!loading && accounts.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          perPage={perPage}
        />
      )}

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
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ 
            backgroundColor: isDark ? '#1e293b' : 'white'
          }}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Cuenta Principal"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Balance Inicial</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                placeholder="0.00"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Moneda</Form.Label>
              <Form.Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="COP">COP - Peso Colombiano</option>
              </Form.Select>
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
              {editingAccount ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Accounts;
