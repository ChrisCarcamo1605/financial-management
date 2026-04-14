import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Tabs, Tab, Spinner } from 'react-bootstrap';
import {
  getSpendingByCategory,
  getCashFlowAnalysis,
  getTrendAnalysis,
  getCategoryComparison,
  getAccountPerformance,
  getSpendingHeatmap,
} from '../services/api';
import Chart from '../components/Chart';
import TrendChart from '../components/TrendChart';
import WaterfallChart from '../components/WaterfallChart';
import HeatmapChart from '../components/HeatmapChart';
import ComparisonChart from '../components/ComparisonChart';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    group_by: 'month',
    window: 3,
  });

  const [spendingData, setSpendingData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        spendingRes,
        cashFlowRes,
        trendRes,
        comparisonRes,
        accountRes,
        heatmapRes,
      ] = await Promise.all([
        getSpendingByCategory(filters),
        getCashFlowAnalysis(filters),
        getTrendAnalysis(filters),
        getCategoryComparison(filters),
        getAccountPerformance(filters),
        getSpendingHeatmap(filters),
      ]);

      setSpendingData(spendingRes.data);
      setCashFlowData(cashFlowRes.data);
      setTrendData(trendRes.data);
      setComparisonData(comparisonRes.data);
      setAccountData(accountRes.data);
      setHeatmapData(heatmapRes.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
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

  const exportToCSV = (data, filename) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="bi bi-bar-chart-line me-2"></i>
            Analytics Avanzados
          </h2>
          <p className="text-muted">Análisis detallado con pandas processing</p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={3}>
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
                  <Col md={3}>
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
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Agrupar por</Form.Label>
                      <Form.Select
                        name="group_by"
                        value={filters.group_by}
                        onChange={handleFilterChange}
                      >
                        <option value="day">Día</option>
                        <option value="week">Semana</option>
                        <option value="month">Mes</option>
                        <option value="quarter">Trimestre</option>
                        <option value="year">Año</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Moving Average Window</Form.Label>
                      <Form.Control
                        type="number"
                        name="window"
                        value={filters.window}
                        onChange={handleFilterChange}
                        min={2}
                        max={12}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {cashFlowData && cashFlowData.summary && (
        <Row className="mb-4">
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
                <Tab eventKey="overview" title="Vista General">
                  {activeTab === 'overview' && (
                    <>
                      <Row className="mb-4">
                        <Col md={6}>
                          <Card>
                            <Card.Header>
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-cash-flow me-2"></i>
                                  Flujo de Caja
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => exportToCSV(cashFlowData?.cash_flow || [], 'cash_flow.csv')}
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Exportar
                                </Button>
                              </div>
                            </Card.Header>
                            <Card.Body style={{ height: '400px' }}>
                              <WaterfallChart data={cashFlowData} />
                            </Card.Body>
                          </Card>
                        </Col>

                        <Col md={6}>
                          <Card>
                            <Card.Header>
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-pie-chart me-2"></i>
                                  Gastos por Categoría
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => exportToCSV(spendingData?.categories || [], 'spending_by_category.csv')}
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Exportar
                                </Button>
                              </div>
                            </Card.Header>
                            <Card.Body style={{ height: '400px' }}>
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
                                        'rgba(199, 199, 199, 0.8)',
                                        'rgba(83, 102, 255, 0.8)',
                                      ],
                                    }],
                                  }}
                                />
                              ) : (
                                <div className="text-center py-5 text-muted">
                                  <p>No hay datos de gastos</p>
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
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-graph-up me-2"></i>
                                  Tendencias con Promedios Móviles
                                </span>
                                <Badge bg="info">MA{filters.window}</Badge>
                              </div>
                            </Card.Header>
                            <Card.Body style={{ height: '400px' }}>
                              <TrendChart data={trendData} window={parseInt(filters.window)} />
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </>
                  )}
                </Tab>

                <Tab eventKey="categories" title="Categorías">
                  {activeTab === 'categories' && (
                    <>
                      <Row className="mb-4">
                        <Col>
                          <Card>
                            <Card.Header>
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-bar-chart me-2"></i>
                                  Comparación de Categorías
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => exportToCSV(comparisonData?.comparison || [], 'category_comparison.csv')}
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Exportar
                                </Button>
                              </div>
                            </Card.Header>
                            <Card.Body style={{ height: '500px' }}>
                              <ComparisonChart data={comparisonData} />
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>

                      <Row>
                        <Col>
                          <Card>
                            <Card.Header>
                              <i className="bi bi-list-ul me-2"></i>
                              Desglose Detallado
                            </Card.Header>
                            <Card.Body>
                              {spendingData && spendingData.categories && spendingData.categories.length > 0 ? (
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th>Categoría</th>
                                        <th className="text-end">Total</th>
                                        <th className="text-end">Transacciones</th>
                                        <th className="text-end">Promedio</th>
                                        <th className="text-end">Mín</th>
                                        <th className="text-end">Máx</th>
                                        <th className="text-end">% del Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {spendingData.categories.map((cat, idx) => (
                                        <tr key={idx}>
                                          <td className="fw-bold">{cat.category_name}</td>
                                          <td className="text-end">{formatCurrency(cat.total_amount)}</td>
                                          <td className="text-end">{cat.transaction_count}</td>
                                          <td className="text-end">{formatCurrency(cat.avg_amount)}</td>
                                          <td className="text-end">{formatCurrency(cat.min_amount)}</td>
                                          <td className="text-end">{formatCurrency(cat.max_amount)}</td>
                                          <td className="text-end">
                                            <Badge bg="primary">{cat.percentage}%</Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="table-primary">
                                        <td className="fw-bold">Total</td>
                                        <td className="text-end fw-bold">
                                          {formatCurrency(spendingData.total)}
                                        </td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td className="text-end">
                                          <Badge bg="primary">100%</Badge>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-center py-5 text-muted">
                                  <p>No hay datos disponibles</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </>
                  )}
                </Tab>

                <Tab eventKey="patterns" title="Patrones">
                  {activeTab === 'patterns' && (
                    <>
                      <Row>
                        <Col>
                          <Card>
                            <Card.Header>
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-grid-3x3 me-2"></i>
                                  Mapa de Calor de Gastos por Semana
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => exportToCSV(heatmapData?.heatmap || [], 'spending_heatmap.csv')}
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Exportar
                                </Button>
                              </div>
                            </Card.Header>
                            <Card.Body>
                              <HeatmapChart data={heatmapData} />
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </>
                  )}
                </Tab>

                <Tab eventKey="accounts" title="Cuentas">
                  {activeTab === 'accounts' && (
                    <>
                      <Row>
                        <Col>
                          <Card>
                            <Card.Header>
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-wallet2 me-2"></i>
                                  Rendimiento de Cuentas
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => exportToCSV(accountData?.accounts || [], 'account_performance.csv')}
                                >
                                  <i className="bi bi-download me-1"></i>
                                  Exportar
                                </Button>
                              </div>
                            </Card.Header>
                            <Card.Body>
                              {accountData && accountData.accounts && accountData.accounts.length > 0 ? (
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th>Cuenta</th>
                                        <th className="text-end">Balance Actual</th>
                                        <th className="text-end">Ingresos</th>
                                        <th className="text-end">Gastos</th>
                                        <th className="text-end">Flujo Neto</th>
                                        <th className="text-end">Transacciones</th>
                                        <th className="text-end">Promedio</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {accountData.accounts.map((acc, idx) => (
                                        <tr key={idx}>
                                          <td className="fw-bold">{acc.name}</td>
                                          <td className="text-end">{formatCurrency(acc.current_balance)}</td>
                                          <td className="text-end text-success">{formatCurrency(acc.total_income)}</td>
                                          <td className="text-end text-danger">{formatCurrency(acc.total_expenses)}</td>
                                          <td className={`text-end fw-bold ${acc.net_flow >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(acc.net_flow)}
                                          </td>
                                          <td className="text-end">{acc.transaction_count}</td>
                                          <td className="text-end">{formatCurrency(acc.avg_transaction)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-center py-5 text-muted">
                                  <p>No hay datos de cuentas disponibles</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </>
                  )}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Analytics;
