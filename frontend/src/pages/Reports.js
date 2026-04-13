import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import { getTransactions, getCategories } from '../services/api';
import Chart from '../components/Chart';

const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        getTransactions(filters),
        getCategories(),
      ]);
      setTransactions(transactionsRes.data.transactions);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Expenses by category
  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const categoryName = t.category_name || 'Sin categoría';
      acc[categoryName] = (acc[categoryName] || 0) + t.amount;
      return acc;
    }, {});

  const categoryChartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        label: 'Gastos por Categoría',
        data: Object.values(expensesByCategory),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
        ],
      },
    ],
  };

  // Income vs Expense over time
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const dailyData = sortedTransactions.reduce((acc, t) => {
    const date = t.date;
    if (!acc[date]) {
      acc[date] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      acc[date].income += t.amount;
    } else {
      acc[date].expense += t.amount;
    }
    return acc;
  }, {});

  const trendData = {
    labels: Object.keys(dailyData),
    datasets: [
      {
        label: 'Ingresos',
        data: Object.values(dailyData).map((d) => d.income),
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        fill: true,
      },
      {
        label: 'Gastos',
        data: Object.values(dailyData).map((d) => d.expense),
        borderColor: 'rgba(220, 53, 69, 1)',
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        fill: true,
      },
    ],
  };

  // Category breakdown
  const categoryBreakdown = categories.map((cat) => {
    const total = transactions
      .filter((t) => t.category_id === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, total };
  }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="bi bi-graph-up me-2"></i>
            Reportes
          </h2>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Fecha Inicio</Form.Label>
                      <Form.Control
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Fecha Fin</Form.Label>
                      <Form.Control
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <>
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <i className="bi bi-pie-chart me-2"></i>
                  Gastos por Categoría
                </Card.Header>
                <Card.Body style={{ height: '350px' }}>
                  {Object.keys(expensesByCategory).length > 0 ? (
                    <Chart type="doughnut" data={categoryChartData} />
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <p>No hay datos de gastos</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Header>
                  <i className="bi bi-graph-up me-2"></i>
                  Tendencia de Ingresos vs Gastos
                </Card.Header>
                <Card.Body style={{ height: '350px' }}>
                  {sortedTransactions.length > 0 ? (
                    <Chart type="line" data={trendData} />
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <i className="bi bi-list-ul me-2"></i>
                  Desglose por Categoría
                </Card.Header>
                <Card.Body>
                  {categoryBreakdown.length > 0 ? (
                    <Row>
                      {categoryBreakdown.map((cat) => (
                        <Col key={cat.id} md={4} className="mb-3">
                          <Card>
                            <Card.Body>
                              <div className="d-flex align-items-center mb-2">
                                {cat.color && (
                                  <div
                                    className="me-2"
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '4px',
                                      backgroundColor: cat.color,
                                    }}
                                  ></div>
                                )}
                                <Card.Title className="mb-0 small">{cat.name}</Card.Title>
                              </div>
                              <h4 className={`mb-0 ${cat.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(cat.total)}
                              </h4>
                              <small className="text-muted">
                                {cat.type === 'income' ? 'Ingresos' : 'Gastos'}
                              </small>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                      <p className="mt-2">No hay datos para el período seleccionado</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default Reports;
