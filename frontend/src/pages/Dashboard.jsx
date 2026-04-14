import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner } from 'react-bootstrap';
import { getDashboardSummary } from '../services/api';
import Chart from '../components/Chart';
import TransactionList from '../components/TransactionList';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await getDashboardSummary();
      setSummary(response.data);
    } catch (err) {
      setError('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <div className="alert alert-danger">{error}</div>
      </Container>
    );
  }

  const incomeVsExpenseData = {
    labels: ['Ingresos', 'Gastos'],
    datasets: [
      {
        label: 'Mensual',
        data: [summary.monthly_income, summary.monthly_expense],
        backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
        borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard
      </h2>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary border-2">
            <Card.Body>
              <Card.Title className="text-muted small">Balance Total</Card.Title>
              <h3 className="mb-0">{formatCurrency(summary.total_balance)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-success border-2">
            <Card.Body>
              <Card.Title className="text-muted small">Ingresos del Mes</Card.Title>
              <h3 className="mb-0 text-success">{formatCurrency(summary.monthly_income)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger border-2">
            <Card.Body>
              <Card.Title className="text-muted small">Gastos del Mes</Card.Title>
              <h3 className="mb-0 text-danger">{formatCurrency(summary.monthly_expense)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className={`border-${summary.monthly_net >= 0 ? 'success' : 'danger'} border-2`}>
            <Card.Body>
              <Card.Title className="text-muted small">Neto Mensual</Card.Title>
              <h3 className={`mb-0 ${summary.monthly_net >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(summary.monthly_net)}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <i className="bi bi-bar-chart me-2"></i>
              Ingresos vs Gastos
            </Card.Header>
            <Card.Body style={{ height: '300px' }}>
              <Chart type="bar" data={incomeVsExpenseData} />
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <i className="bi bi-pie-chart me-2"></i>
              Estado de Presupuestos
            </Card.Header>
            <Card.Body>
              {summary.budgets_status && summary.budgets_status.length > 0 ? (
                summary.budgets_status.map((budget) => (
                  <div key={budget.id} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>{budget.category_name}</span>
                      <Badge bg={budget.percentage > 90 ? 'danger' : budget.percentage > 70 ? 'warning' : 'success'}>
                        {budget.percentage.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="progress" style={{ height: '20px' }}>
                      <div
                        className={`progress-bar ${
                          budget.percentage > 90
                            ? 'bg-danger'
                            : budget.percentage > 70
                            ? 'bg-warning'
                            : 'bg-success'
                        }`}
                        role="progressbar"
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      >
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted text-center">No hay presupuestos activos</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <i className="bi bi-clock-history me-2"></i>
              Transacciones Recientes
            </Card.Header>
            <Card.Body>
              <TransactionList
                transactions={summary.recent_transactions || []}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
