import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Tabs, Tab, Spinner } from 'react-bootstrap';
import { getTransactions, getCategories, getSpendingByCategory, getCashFlowAnalysis, getTrendAnalysis } from '../services/api';
import Chart from '../components/Chart';
import TrendChart from '../components/TrendChart';
import WaterfallChart from '../components/WaterfallChart';

const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [pandasLoading, setPandasLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  // Pandas-processed data
  const [spendingData, setSpendingData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [trendData, setTrendData] = useState(null);

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

  const fetchPandasData = async () => {
    setPandasLoading(true);
    try {
      const [spendingRes, cashFlowRes, trendRes] = await Promise.all([
        getSpendingByCategory(filters),
        getCashFlowAnalysis(filters),
        getTrendAnalysis(filters),
      ]);
      setSpendingData(spendingRes.data);
      setCashFlowData(cashFlowRes.data);
      setTrendData(trendRes.data);
    } catch (error) {
      console.error('Error fetching pandas data:', error);
    } finally {
      setPandasLoading(false);
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

  const trendDataLocal = {
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
          <p className="text-muted">Análisis básico y con pandas processing</p>
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
                  <Col md={4} className="d-flex align-items-end">
                    <Button
                      variant="outline-primary"
                      onClick={fetchPandasData}
                      disabled={pandasLoading}
                    >
                      {pandasLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Cargando pandas...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-bar-chart me-2"></i>
                          Cargar Analytics con Pandas
                        </>
                      )}
                    </Button>
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
          <Row>
            <Col>
              <Card>
                <Card.Body>
                  <Tabs
                    activeKey={activeTab}
                    onSelect={setActiveTab}
                    className="mb-4"
                    fill
                  >
                    <Tab eventKey="basic" title="Vista Básica">
                      {activeTab === 'basic' && (
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
                                    <Chart type="line" data={trendDataLocal} />
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
                    </Tab>

                    <Tab eventKey="pandas" title="Analytics (Pandas)">
                      {activeTab === 'pandas' && (
                        <>
                          {pandasLoading ? (
                            <div className="text-center py-5">
                              <Spinner animation="border" variant="primary" />
                              <p className="mt-3 text-muted">Cargando analytics con pandas...</p>
                            </div>
                          ) : (
                            <>
                              <Row className="mb-4">
                                <Col md={6}>
                                  <Card>
                                    <Card.Header>
                                      <i className="bi bi-cash-flow me-2"></i>
                                      Flujo de Caja (Pandas)
                                    </Card.Header>
                                    <Card.Body style={{ height: '350px' }}>
                                      <WaterfallChart data={cashFlowData} />
                                    </Card.Body>
                                  </Card>
                                </Col>

                                <Col md={6}>
                                  <Card>
                                    <Card.Header>
                                      <i className="bi bi-pie-chart me-2"></i>
                                      Gastos por Categoría (Pandas)
                                    </Card.Header>
                                    <Card.Body style={{ height: '350px' }}>
                                      {spendingData && spendingData.categories && spendingData.categories.length > 0 ? (
                                        <Chart
                                          type="doughnut"
                                          data={{
                                            labels: spendingData.categories.map(c => c.category_name),
                                            datasets: [{
                                              data: spendingData.categories.map(c => c.total_amount),
                                              backgroundColor: [
                                                'rgba(255, 99, 132, 0.8)',
                                                'rgba(54, 162, 235, 0.8)',
                                                'rgba(255, 206, 86, 0.8)',
                                                'rgba(75, 192, 192, 0.8)',
                                                'rgba(153, 102, 255, 0.8)',
                                                'rgba(255, 159, 64, 0.8)',
                                              ],
                                            }],
                                          }}
                                        />
                                      ) : (
                                        <div className="text-center py-5 text-muted">
                                          <p>Haz clic en "Cargar Analytics" para ver los datos</p>
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
                                      <i className="bi bi-graph-up me-2"></i>
                                      Tendencias con Promedios Móviles (Pandas)
                                    </Card.Header>
                                    <Card.Body style={{ height: '400px' }}>
                                      <TrendChart data={trendData} window={3} />
                                    </Card.Body>
                                  </Card>
                                </Col>
                              </Row>

                              {cashFlowData && cashFlowData.summary && (
                                <Row className="mt-4">
                                  <Col md={3}>
                                    <Card className="border-success border-2">
                                      <Card.Body>
                                        <Card.Title className="text-muted small">Ingreso Total</Card.Title>
                                        <h4 className="text-success mb-0">
                                          {formatCurrency(cashFlowData.summary.total_income)}
                                        </h4>
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                  <Col md={3}>
                                    <Card className="border-danger border-2">
                                      <Card.Body>
                                        <Card.Title className="text-muted small">Gasto Total</Card.Title>
                                        <h4 className="text-danger mb-0">
                                          {formatCurrency(cashFlowData.summary.total_expense)}
                                        </h4>
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                  <Col md={3}>
                                    <Card className={`border-${cashFlowData.summary.net_flow >= 0 ? 'success' : 'danger'} border-2`}>
                                      <Card.Body>
                                        <Card.Title className="text-muted small">Flujo Neto</Card.Title>
                                        <h4 className={`mb-0 ${cashFlowData.summary.net_flow >= 0 ? 'text-success' : 'text-danger'}`}>
                                          {formatCurrency(cashFlowData.summary.net_flow)}
                                        </h4>
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                  <Col md={3}>
                                    <Card className="border-primary border-2">
                                      <Card.Body>
                                        <Card.Title className="text-muted small">Tasa de Ahorro</Card.Title>
                                        <h4 className="text-primary mb-0">
                                          {cashFlowData.summary.savings_rate}%
                                        </h4>
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                </Row>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </Tab>
                  </Tabs>
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
