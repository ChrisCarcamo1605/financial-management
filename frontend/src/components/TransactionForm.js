import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { getAccounts, getCategories, createTransaction, updateTransaction } from '../services/api';

const TransactionForm = ({ show, handleClose, transaction, onSuccess }) => {
  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    amount: '',
    type: 'expense',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          getAccounts(),
          getCategories(),
        ]);
        setAccounts(accountsRes.data);
        setCategories(categoriesRes.data);
      } catch (err) {
        setError('Error loading data');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (transaction) {
      setFormData({
        account_id: transaction.account_id || '',
        category_id: transaction.category_id || '',
        amount: transaction.amount || '',
        type: transaction.type || 'expense',
        description: transaction.description || '',
        date: transaction.date || new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        account_id: '',
        category_id: '',
        amount: '',
        type: 'expense',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [transaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (transaction) {
        await updateTransaction(transaction.id, formData);
      } else {
        await createTransaction(formData);
      }
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) => cat.type === formData.type);

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {transaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo</Form.Label>
                <Form.Select name="type" value={formData.type} onChange={handleChange} required>
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Monto</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Cuenta</Form.Label>
                <Form.Select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción opcional"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Fecha</Form.Label>
            <Form.Control
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : transaction ? 'Actualizar' : 'Crear'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default TransactionForm;
