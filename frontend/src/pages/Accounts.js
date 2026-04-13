import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/api';

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

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await getAccounts();
      setAccounts(response.data);
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
      fetchAccounts();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving account');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta? Se eliminarán también las transacciones asociadas.')) {
      try {
        await deleteAccount(id);
        fetchAccounts();
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

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="bi bi-bank me-2"></i>
              Cuentas
            </h2>
            <Button variant="primary" onClick={() => handleShow()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nueva Cuenta
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        {accounts.map((account) => (
          <Col key={account.id} md={4} className="mb-3">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <Card.Title>{account.name}</Card.Title>
                    <Card.Text className="text-muted small">{account.currency}</Card.Text>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleShow(account)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </div>
                <hr />
                <h3 className={`mb-0 ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(account.balance)}
                </h3>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {accounts.length === 0 && !loading && (
        <Row>
          <Col>
            <Card>
              <Card.Body className="text-center py-5">
                <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                <p className="mt-2 text-muted">No hay cuentas registradas</p>
                <Button variant="primary" onClick={() => handleShow()}>
                  Crear Primera Cuenta
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
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
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
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
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
