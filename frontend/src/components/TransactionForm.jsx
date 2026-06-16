import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { getAccounts, getCategories, getLoans, createTransaction, updateTransaction } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const TransactionForm = ({ show, handleClose, transaction, onSuccess }) => {
  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    amount: '',
    type: 'expense',
    description: '',
    date: new Date().toISOString().split('T')[0],
    loan_id: '',
  });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loans, setLoans] = useState([]);
  const [isLoanPayment, setIsLoanPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingData, setFetchingData] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchData = async () => {
      setFetchingData(true);
      try {
        const [accountsRes, categoriesRes, loansRes] = await Promise.all([
          getAccounts({ page: 1, per_page: 100 }),
          getCategories({ page: 1, per_page: 200 }),
          getLoans({ page: 1, per_page: 100 }),
        ]);
        setAccounts(Array.isArray(accountsRes.data?.data) ? accountsRes.data.data : []);
        setCategories(Array.isArray(categoriesRes.data?.data) ? categoriesRes.data.data : []);
        setLoans(Array.isArray(loansRes.data?.data) ? loansRes.data.data : []);
      } catch (err) {
        console.error('Error loading accounts/categories/loans:', err);
        setError('Error cargando datos. Intente nuevamente.');
        setAccounts([]);
        setCategories([]);
        setLoans([]);
      } finally {
        setFetchingData(false);
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
        loan_id: transaction.loan_id || '',
      });
      setIsLoanPayment(Boolean(transaction.loan_id));
    } else {
      setFormData({
        account_id: '',
        category_id: '',
        amount: '',
        type: 'expense',
        description: '',
        date: new Date().toISOString().split('T')[0],
        loan_id: '',
      });
      setIsLoanPayment(false);
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

    // El vínculo con préstamo solo aplica a gastos y cuando está marcado.
    const linkLoan = isLoanPayment && formData.type === 'expense';
    if (linkLoan && !formData.loan_id) {
      setLoading(false);
      setError('Selecciona el préstamo al que abonas');
      return;
    }
    const payload = { ...formData, loan_id: linkLoan ? formData.loan_id : null };

    try {
      if (transaction) {
        await updateTransaction(transaction.id, payload);
      } else {
        await createTransaction(payload);
      }
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = Array.isArray(categories) ? categories.filter((cat) => cat.type === formData.type) : [];
  const activeLoans = Array.isArray(loans) ? loans.filter((l) => l.status !== 'paid') : [];

  const formatMoney = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton style={{ 
          backgroundColor: isDark ? '#1e293b' : 'white',
          borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
        }}>
          <Modal.Title style={{ 
            color: isDark ? '#f1f5f9' : '#0f172a',
            fontWeight: 600
          }}>
            {transaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ 
          backgroundColor: isDark ? '#1e293b' : 'white'
        }}>
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
                  disabled={fetchingData}
                >
                  <option value="">Seleccionar cuenta</option>
                  {Array.isArray(accounts) && accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.balance !== undefined ? `($${acc.balance.toFixed(2)})` : ''}
                    </option>
                  ))}
                </Form.Select>
                {fetchingData && (
                  <div className="text-muted small mt-1">
                    <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                    Cargando cuentas...
                  </div>
                )}
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
                  disabled={fetchingData}
                >
                  <option value="">Seleccionar categoría</option>
                  {Array.isArray(filteredCategories) && filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Select>
                {fetchingData && (
                  <div className="text-muted small mt-1">
                    <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                    Cargando categorías...
                  </div>
                )}
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

          {/* Vínculo con préstamo — solo para gastos */}
          {formData.type === 'expense' && activeLoans.length > 0 && (
            <div
              className="p-3 mb-1"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                background: isDark ? '#0f172a' : '#f8fafc',
              }}
            >
              <Form.Check
                type="checkbox"
                id="is-loan-payment"
                label="Es el pago de un préstamo"
                checked={isLoanPayment}
                onChange={(e) => setIsLoanPayment(e.target.checked)}
              />
              {isLoanPayment && (
                <div className="mt-3">
                  <Form.Label style={{ fontSize: '0.8125rem' }}>Préstamo</Form.Label>
                  <Form.Select
                    name="loan_id"
                    value={formData.loan_id}
                    onChange={handleChange}
                    required={isLoanPayment}
                  >
                    <option value="">Seleccionar préstamo...</option>
                    {activeLoans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — resta {formatMoney(l.remaining)}
                      </option>
                    ))}
                  </Form.Select>
                  <p className="mb-0 mt-2" style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                    El monto se abona al préstamo; si pagas de más, se salda más rápido.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          backgroundColor: isDark ? '#1e293b' : 'white',
          borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
        }}>
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
