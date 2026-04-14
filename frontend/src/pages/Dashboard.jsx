import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, deleteTransaction } from '../services/api';
import Chart from '../components/Chart';
import TransactionList from '../components/TransactionList';
import { StatCard, PageHeader, LoadingSkeleton, EmptyState } from '../components/ui';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleEdit = (transaction) => {
    navigate('/transactions', { state: { editingTransaction: transaction } });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await deleteTransaction(id);
        fetchSummary();
      } catch (err) {
        console.error('Error deleting transaction:', err);
      }
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
      <Container fluid className="py-4">
        <div className="mb-4">
          <div className="animate-shimmer" style={{ height: '40px', width: '200px', borderRadius: 'var(--radius-lg)', backgroundSize: '200% 100%' }} />
        </div>
        <Row className="mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Col md={3} key={i}>
              <LoadingSkeleton type="stat" count={1} />
            </Col>
          ))}
        </Row>
        <Row>
          <Col md={6}>
            <LoadingSkeleton type="card" count={1} />
          </Col>
          <Col md={6}>
            <LoadingSkeleton type="card" count={1} />
          </Col>
        </Row>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <EmptyState
          icon="exclamation-triangle"
          title="Error al cargar"
          description={error}
          actionLabel="Reintentar"
          onAction={fetchSummary}
        />
      </Container>
    );
  }

  const incomeVsExpenseData = {
    labels: ['Ingresos', 'Gastos'],
    datasets: [
      {
        label: 'Mensual',
        data: [summary.monthly_income, summary.monthly_expense],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(244, 63, 94, 0.85)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(244, 63, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#0f172a',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        titleFont: {
          family: 'Outfit',
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: 'JetBrains Mono',
          size: 13,
        },
        callbacks: {
          label: function(context) {
            return formatCurrency(context.raw);
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Outfit',
            size: 13,
            weight: '500',
          },
          color: '#64748b',
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          borderDash: [5, 5],
        },
        ticks: {
          font: {
            family: 'JetBrains Mono',
            size: 12,
          },
          color: '#64748b',
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen de tus finanzas"
        icon="speedometer2"
      />

      {/* Summary Cards */}
      <Row className="g-4 mb-4">
        <Col md={3} sm={6}>
          <div className="animate-fade-in-up stagger-1">
            <StatCard
              title="Balance Total"
              value={summary.total_balance}
              icon="wallet2"
              color="primary"
              prefix="$"
            />
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="animate-fade-in-up stagger-2">
            <StatCard
              title="Ingresos del Mes"
              value={summary.monthly_income}
              icon="arrow-up-circle"
              color="success"
              prefix="$"
            />
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="animate-fade-in-up stagger-3">
            <StatCard
              title="Gastos del Mes"
              value={summary.monthly_expense}
              icon="arrow-down-circle"
              color="danger"
              prefix="$"
            />
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="animate-fade-in-up stagger-4">
            <StatCard
              title="Neto Mensual"
              value={summary.monthly_net}
              icon="piggy-bank"
              color={summary.monthly_net >= 0 ? 'success' : 'danger'}
              prefix="$"
            />
          </div>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="h-100 animate-fade-in-up stagger-5">
            <Card.Header>
              <div className="d-flex align-items-center gap-2">
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                }}>
                  <i className="bi bi-bar-chart"></i>
                </div>
                <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Ingresos vs Gastos</span>
              </div>
            </Card.Header>
            <Card.Body style={{ height: '200px' }}>
              <Chart type="bar" data={incomeVsExpenseData} options={chartOptions} />
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100 animate-fade-in-up stagger-6">
            <Card.Header className="d-flex align-items-center gap-2" style={{ color: 'var(--slate-800)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
              }}>
                <i className="bi bi-pie-chart"></i>
              </div>
              <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Estado de Presupuestos</span>
            </Card.Header>
            <Card.Body>
              {summary.budgets_status && Array.isArray(summary.budgets_status) && summary.budgets_status.length > 0 ? (
                <div className="vstack gap-3">
                  {summary.budgets_status.map((budget, idx) => (
                    <div 
                      key={budget.id} 
                      className="p-3 rounded-3"
                      style={{ 
                        backgroundColor: 'var(--slate-50)',
                        animationDelay: `${idx * 0.1}s`,
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: budget.percentage > 90 ? 'var(--danger-500)' : budget.percentage > 70 ? 'var(--warning-500)' : 'var(--success-500)',
                            }}
                          />
                          <span className="fw-500" style={{ color: 'var(--slate-800)' }}>{budget.category_name}</span>
                        </div>
                        <Badge 
                          bg="transparent"
                          style={{
                            color: budget.percentage > 90 ? 'var(--danger-600)' : budget.percentage > 70 ? 'var(--warning-600)' : 'var(--success-600)',
                            backgroundColor: budget.percentage > 90 ? 'var(--danger-50)' : budget.percentage > 70 ? 'var(--warning-50)' : 'var(--success-50)',
                            fontWeight: 600,
                            padding: '0.375rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          {budget.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar"
                          style={{ 
                            width: `${Math.min(budget.percentage, 100)}%`,
                            backgroundColor: budget.percentage > 90 ? 'var(--danger-500)' : budget.percentage > 70 ? 'var(--warning-500)' : 'var(--success-500)',
                          }}
                        />
                      </div>
                      <div className="d-flex justify-content-between mt-2">
                        <small className="text-muted mono">
                          {formatCurrency(budget.spent)}
                        </small>
                        <small className="text-muted mono">
                          {formatCurrency(budget.amount)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                  <p className="mt-2">No hay presupuestos activos</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="animate-fade-in-up stagger-7">
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex align-items-center gap-2">
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                }}>
                  <i className="bi bi-clock-history"></i>
                </div>
                <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Transacciones Recientes</span>
              </div>
            </Card.Header>
            <Card.Body>
              {summary.recent_transactions && Array.isArray(summary.recent_transactions) && summary.recent_transactions.length > 0 ? (
                <TransactionList
                  transactions={summary.recent_transactions || []}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ) : (
                <EmptyState
                  icon="arrow-left-right"
                  title="Sin transacciones"
                  description="Agrega tu primera transacción para verla aquí"
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
