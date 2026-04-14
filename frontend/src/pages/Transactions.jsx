import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge } from 'react-bootstrap';
import { getTransactions, deleteTransaction } from '../services/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import { PageHeader, LoadingSkeleton, EmptyState, Pagination } from '../components/ui';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    start_date: '',
    end_date: '',
  });
  
  // Pagination state (using limit/offset pattern)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 50;

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage, filters]);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    const offset = (page - 1) * limit;
    try {
      const params = {
        ...filters,
        limit,
        offset,
      };
      const response = await getTransactions(params);
      setTransactions(response.data.data);
      setTotalItems(response.data.total);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await deleteTransaction(id);
        fetchTransactions(currentPage);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleFormSuccess = () => {
    fetchTransactions();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const quickFilters = [
    { label: 'Todos', value: { type: '', start_date: '', end_date: '' } },
    { label: 'Este mes', value: { type: '', start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] } },
    { label: 'Últimos 7 días', value: { type: '', start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] } },
    { label: 'Ingresos', value: { type: 'income', start_date: '', end_date: '' } },
    { label: 'Gastos', value: { type: 'expense', start_date: '', end_date: '' } },
  ];

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Transacciones"
        subtitle="Gestiona tus ingresos y gastos"
        icon="arrow-left-right"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-circle me-2"></i>
            Nueva Transacción
          </Button>
        }
      />

      {/* Quick Filters */}
      <Card className="mb-4 animate-fade-in-up">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted fw-500 me-2">
              <i className="bi bi-funnel me-1"></i> Filtros rápidos:
            </span>
            {quickFilters.map((filter, idx) => (
              <Button
                key={idx}
                variant={
                  JSON.stringify(filters) === JSON.stringify(filter.value)
                    ? 'primary'
                    : 'light'
                }
                size="sm"
                onClick={() => setFilters(filter.value)}
                style={{
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  padding: '0.375rem 0.875rem',
                  border: 'none',
                }}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <Form className="mt-3">
            <Row className="g-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small text-muted">Tipo</Form.Label>
                  <Form.Select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    size="sm"
                  >
                    <option value="">Todos</option>
                    <option value="income">Ingresos</option>
                    <option value="expense">Gastos</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small text-muted">Fecha Inicio</Form.Label>
                  <Form.Control
                    type="date"
                    name="start_date"
                    value={filters.start_date}
                    onChange={handleFilterChange}
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small text-muted">Fecha Fin</Form.Label>
                  <Form.Control
                    type="date"
                    name="end_date"
                    value={filters.end_date}
                    onChange={handleFilterChange}
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setFilters({ type: '', start_date: '', end_date: '' })}
                  className="w-100"
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Limpiar
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Transaction List */}
      <Card className="animate-fade-in-up">
        {loading ? (
          <Card.Body>
            <LoadingSkeleton type="table" count={5} />
          </Card.Body>
        ) : transactions.length > 0 ? (
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState
            icon="arrow-left-right"
            title="No hay transacciones"
            description="Agrega tu primera transacción para comenzar a registrar tus finanzas"
            actionLabel="Nueva Transacción"
            onAction={() => setShowForm(true)}
          />
        )}
      </Card>

      {/* Pagination */}
      {!loading && transactions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / limit)}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          perPage={limit}
        />
      )}

      <TransactionForm
        show={showForm}
        handleClose={handleFormClose}
        transaction={editingTransaction}
        onSuccess={handleFormSuccess}
      />
    </Container>
  );
};

export default Transactions;
