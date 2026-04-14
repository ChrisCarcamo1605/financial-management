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

  // Reactive dark mode state
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching analytics data with filters:', filters);
      
      // Filter params for each endpoint
      const dateParams = { start_date: filters.start_date, end_date: filters.end_date };
      const cashFlowParams = { ...dateParams, group_by: filters.group_by };
      const trendParams = { ...dateParams, window: filters.window };
      
      const results = await Promise.allSettled([
        getSpendingByCategory(dateParams),
        getCashFlowAnalysis(cashFlowParams),
        getTrendAnalysis(trendParams),
        getCategoryComparison(dateParams),
        getAccountPerformance(dateParams),
        getSpendingHeatmap(dateParams),
      ]);

      // Handle each result independently
      if (results[0].status === 'fulfilled') {
        console.log('📊 spendingData:', results[0].value.data);
        setSpendingData(results[0].value.data);
      } else {
        console.error('❌ spendingByCategory failed:', results[0].reason);
        setSpendingData(null);
      }

      if (results[1].status === 'fulfilled') {
        console.log('💰 cashFlowData:', results[1].value.data);
        setCashFlowData(results[1].value.data);
      } else {
        console.error('❌ cashFlowAnalysis failed:', results[1].reason);
        setCashFlowData(null);
      }

      if (results[2].status === 'fulfilled') {
        console.log('📈 trendData:', results[2].value.data);
        setTrendData(results[2].value.data);
      } else {
        console.error('❌ trendAnalysis failed:', results[2].reason);
        setTrendData(null);
      }

      if (results[3].status === 'fulfilled') {
        console.log('📊 comparisonData:', results[3].value.data);
        setComparisonData(results[3].value.data);
      } else {
        console.error('❌ categoryComparison failed:', results[3].reason);
        setComparisonData(null);
      }

      if (results[4].status === 'fulfilled') {
        console.log('🏦 accountData:', results[4].value.data);
        setAccountData(results[4].value.data);
      } else {
        console.error('❌ accountPerformance failed:', results[4].reason);
        setAccountData(null);
      }

      if (results[5].status === 'fulfilled') {
        console.log('🗺️ heatmapData:', results[5].value.data);
        setHeatmapData(results[5].value.data);
      } else {
        console.error('❌ heatmap failed:', results[5].reason);
        setHeatmapData(null);
      }

    } catch (error) {
      console.error('❌ Critical error fetching analytics:', error);
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
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} />
          <p className="text-muted mb-0">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  // Styles
  const cardStyle = {
    background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
    borderRadius: '16px',
    boxShadow: isDark ? '0 4px 24px rgba(0, 0, 0, 0.2)' : '0 4px 24px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const statCardStyle = (gradient) => ({
    ...cardStyle,
    background: isDark ? gradient : 'white',
    border: isDark ? 'none' : `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : '#e2e8f0'}`,
    position: 'relative',
    overflow: 'hidden',
  });

  const statCardBeforeStyle = {
    content: '""',
    position: 'absolute',
    top: '-50%',
    right: '-50%',
    width: '200%',
    height: '200%',
    background: isDark ? 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(51, 141, 252, 0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  };

  // Icon container style with better visibility
  const iconContainerStyle = (bgColor) => ({
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: isDark ? 'rgba(255, 255, 255, 0.15)' : bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    color: isDark ? 'white' : 'white',
    boxShadow: isDark ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.15)',
  });

  // Text styles for stat cards
  const statLabelStyle = {
    color: isDark ? 'rgba(255, 255, 255, 0.8)' : '#64748b',
    fontSize: '0.875rem',
    fontWeight: 500,
  };

  const statValueStyle = {
    color: isDark ? 'white' : '#0f172a',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-2 fw-bold" style={{ fontSize: '2rem' }}>
          <i className="bi bi-bar-chart-line me-2" style={{ color: '#338dfc' }}></i>
          Analytics Avanzados
        </h2>
        <p className="text-muted mb-0" style={{ fontSize: '1.05rem' }}>
          Análisis detallado con procesamiento de datos en tiempo real
        </p>
      </div>

      {/* Filters */}
      <Card style={cardStyle} className="mb-4">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold mb-2" style={{ fontSize: '0.875rem' }}>Fecha Inicio</Form.Label>
                <Form.Control
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#0f172a' : 'white',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold mb-2" style={{ fontSize: '0.875rem' }}>Fecha Fin</Form.Label>
                <Form.Control
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#0f172a' : 'white',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold mb-2" style={{ fontSize: '0.875rem' }}>Agrupar por</Form.Label>
                <Form.Select
                  name="group_by"
                  value={filters.group_by}
                  onChange={handleFilterChange}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#0f172a' : 'white',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                  }}
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
                <Form.Label className="fw-semibold mb-2" style={{ fontSize: '0.875rem' }}>Moving Average Window</Form.Label>
                <Form.Control
                  type="number"
                  name="window"
                  value={filters.window}
                  onChange={handleFilterChange}
                  min={2}
                  max={12}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#0f172a' : 'white',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                  }}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      {cashFlowData && cashFlowData.summary && (
        <Row className="mb-4 g-3">
          {/* Income */}
          <Col md={3} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #10b981 0%, #059669 100%)')} className="h-100">
              <div style={statCardBeforeStyle}></div>
              <Card.Body className="p-4 position-relative">
                <div className="d-flex align-items-center mb-3">
                  <div style={iconContainerStyle('#10b981')}>
                    <i className="bi bi-arrow-up-circle"></i>
                  </div>
                </div>
                <p className="mb-1" style={statLabelStyle}>Ingreso Total</p>
                <div style={statValueStyle}>
                  {formatCurrency(cashFlowData.summary.total_income)}
                </div>
              </Card.Body>
            </Card>
          </Col>
          {/* Expense */}
          <Col md={3} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)')} className="h-100">
              <div style={statCardBeforeStyle}></div>
              <Card.Body className="p-4 position-relative">
                <div className="d-flex align-items-center mb-3">
                  <div style={iconContainerStyle('#f43f5e')}>
                    <i className="bi bi-arrow-down-circle"></i>
                  </div>
                </div>
                <p className="mb-1" style={statLabelStyle}>Gasto Total</p>
                <div style={statValueStyle}>
                  {formatCurrency(cashFlowData.summary.total_expense)}
                </div>
              </Card.Body>
            </Card>
          </Col>
          {/* Net Flow */}
          <Col md={3} sm={6}>
            <Card style={statCardStyle(cashFlowData.summary.net_flow >= 0
              ? 'linear-gradient(135deg, #338dfc 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            )} className="h-100">
              <div style={statCardBeforeStyle}></div>
              <Card.Body className="p-4 position-relative">
                <div className="d-flex align-items-center mb-3">
                  <div style={iconContainerStyle(cashFlowData.summary.net_flow >= 0 ? '#338dfc' : '#f59e0b')}>
                    <i className="bi bi-wallet2"></i>
                  </div>
                </div>
                <p className="mb-1" style={statLabelStyle}>Flujo Neto</p>
                <div style={statValueStyle}>
                  {formatCurrency(cashFlowData.summary.net_flow)}
                </div>
              </Card.Body>
            </Card>
          </Col>
          {/* Savings Rate */}
          <Col md={3} sm={6}>
            <Card style={statCardStyle('linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)')} className="h-100">
              <div style={statCardBeforeStyle}></div>
              <Card.Body className="p-4 position-relative">
                <div className="d-flex align-items-center mb-3">
                  <div style={iconContainerStyle('#8b5cf6')}>
                    <i className="bi bi-piggy-bank"></i>
                  </div>
                </div>
                <p className="mb-1" style={statLabelStyle}>Tasa de Ahorro</p>
                <div style={statValueStyle}>
                  {cashFlowData.summary.savings_rate}%
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs */}
      <Card style={cardStyle}>
        <Card.Body className="p-0">
          {/* Custom Tab Styles */}
          <style>{`
            /* Force all tab link text to be visible */
            .nav-tabs .nav-link *,
            .nav-tabs .nav-link,
            .nav-tabs .nav-link span,
            .nav-tabs .nav-link i,
            .nav-tabs button.nav-link,
            .nav-tabs button.nav-link span,
            .nav-tabs button.nav-link i {
              color: ${isDark ? '#cbd5e1' : '#64748b'} !important;
              text-shadow: none !important;
            }
            .nav-tabs .nav-link {
              border: none !important;
              border-radius: 12px 12px 0 0 !important;
              padding: 1rem 1.5rem !important;
              font-weight: 500 !important;
              background: transparent !important;
              transition: all 0.2s ease !important;
              opacity: 0.75 !important;
            }
            .nav-tabs .nav-link:hover,
            .nav-tabs .nav-link:hover *,
            .nav-tabs .nav-link:hover span,
            .nav-tabs .nav-link:hover i,
            .nav-tabs button.nav-link:hover,
            .nav-tabs button.nav-link:hover span,
            .nav-tabs button.nav-link:hover i {
              color: ${isDark ? '#e2e8f0' : '#1e293b'} !important;
              background: ${isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.05)'} !important;
              opacity: 1 !important;
            }
            .nav-tabs .nav-link.active,
            .nav-tabs .nav-link.active *,
            .nav-tabs .nav-link.active span,
            .nav-tabs .nav-link.active i,
            .nav-tabs button.nav-link.active,
            .nav-tabs button.nav-link.active span,
            .nav-tabs button.nav-link.active i {
              color: ${isDark ? '#ffffff' : '#0f172a'} !important;
            }
            .nav-tabs .nav-link.active {
              background: ${isDark ? 'rgba(51, 141, 252, 0.15)' : 'rgba(51, 141, 252, 0.06)'} !important;
              border-bottom: 2px solid #338dfc !important;
              font-weight: 600 !important;
              opacity: 1 !important;
            }
            .nav-tabs .nav-link.active:hover,
            .nav-tabs .nav-link.active:hover *,
            .nav-tabs .nav-link.active:hover span,
            .nav-tabs .nav-link.active:hover i,
            .nav-tabs button.nav-link.active:hover,
            .nav-tabs button.nav-link.active:hover span,
            .nav-tabs button.nav-link.active:hover i {
              color: ${isDark ? '#ffffff' : '#0f172a'} !important;
              background: ${isDark ? 'rgba(51, 141, 252, 0.2)' : 'rgba(51, 141, 252, 0.08)'} !important;
            }
            .nav-tabs {
              border-bottom: 1px solid ${isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(15, 23, 42, 0.08)'} !important;
            }
            /* Fix Bootstrap's default focus styles */
            .nav-tabs .nav-link:focus,
            .nav-tabs .nav-link:focus-visible {
              outline: none !important;
              box-shadow: none !important;
              border: none !important;
            }
            /* Remove any box/border from icons or text on hover */
            .nav-tabs .nav-link:hover span,
            .nav-tabs .nav-link:hover i,
            .nav-tabs .nav-link span::selection,
            .nav-tabs .nav-link i::selection {
              outline: none !important;
              box-shadow: none !important;
              border: none !important;
              background: transparent !important;
            }
          `}</style>
          <Tabs
            activeKey={activeTab}
            onSelect={setActiveTab}
            className="mb-0 px-4 pt-4"
            fill
          >
            <Tab eventKey="overview" title={
              <span><i className="bi bi-grid me-2"></i>Vista General</span>
            }>
              {activeTab === 'overview' && (
                <div className="p-4">
                  <Row className="g-4">
                    <Col xl={6}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">
                              <i className="bi bi-cash-flow me-2" style={{ color: '#338dfc' }}></i>
                              Flujo de Caja
                            </span>
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => exportToCSV(cashFlowData?.cash_flow || [], 'cash_flow.csv')}
                              style={{ borderRadius: '8px', fontSize: '0.8125rem' }}
                            >
                              <i className="bi bi-download me-1"></i>
                              Exportar
                            </Button>
                          </div>
                        </Card.Header>
                        <Card.Body style={{ height: '320px' }}>
                          <WaterfallChart data={cashFlowData} />
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xl={6}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">
                              <i className="bi bi-pie-chart me-2" style={{ color: '#f43f5e' }}></i>
                              Gastos por Categoría
                            </span>
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => exportToCSV(spendingData?.categories || [], 'spending_by_category.csv')}
                              style={{ borderRadius: '8px', fontSize: '0.8125rem' }}
                            >
                              <i className="bi bi-download me-1"></i>
                              Exportar
                            </Button>
                          </div>
                        </Card.Header>
                        <Card.Body style={{ height: '320px' }}>
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

                    <Col xs={12}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">
                              <i className="bi bi-graph-up me-2" style={{ color: '#10b981' }}></i>
                              Tendencias con Promedios Móviles
                            </span>
                            <Badge bg="info" style={{ borderRadius: '8px', fontSize: '0.75rem' }}>
                              MA{filters.window}
                            </Badge>
                          </div>
                        </Card.Header>
                        <Card.Body style={{ height: '350px' }}>
                          <TrendChart data={trendData} window={parseInt(filters.window)} />
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}
            </Tab>

            <Tab eventKey="categories" title={
              <span><i className="bi bi-tags me-2"></i>Categorías</span>
            }>
              {activeTab === 'categories' && (
                <div className="p-4">
                  <Row className="g-4">
                    <Col xs={12}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">
                              <i className="bi bi-bar-chart me-2" style={{ color: '#8b5cf6' }}></i>
                              Comparación de Categorías
                            </span>
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => exportToCSV(comparisonData?.comparison || [], 'category_comparison.csv')}
                              style={{ borderRadius: '8px', fontSize: '0.8125rem' }}
                            >
                              <i className="bi bi-download me-1"></i>
                              Exportar
                            </Button>
                          </div>
                        </Card.Header>
                        <Card.Body style={{ height: '320px' }}>
                          <ComparisonChart data={comparisonData} />
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xs={12}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <span className="fw-semibold">
                            <i className="bi bi-list-ul me-2" style={{ color: '#f59e0b' }}></i>
                            Desglose Detallado
                          </span>
                        </Card.Header>
                        <Card.Body>
                          {spendingData && spendingData.categories && spendingData.categories.length > 0 ? (
                            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                                  {spendingData.categories && Array.isArray(spendingData.categories) && spendingData.categories.map((cat, idx) => (
                                    <tr key={idx}>
                                      <td className="fw-bold">{cat.category_name}</td>
                                      <td className="text-end">{formatCurrency(cat.total_amount)}</td>
                                      <td className="text-end">{cat.transaction_count}</td>
                                      <td className="text-end">{formatCurrency(cat.avg_amount)}</td>
                                      <td className="text-end">{formatCurrency(cat.min_amount)}</td>
                                      <td className="text-end">{formatCurrency(cat.max_amount)}</td>
                                      <td className="text-end">
                                        <Badge bg="primary" style={{ borderRadius: '6px' }}>{cat.percentage}%</Badge>
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
                                      <Badge bg="primary" style={{ borderRadius: '6px' }}>100%</Badge>
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
                </div>
              )}
            </Tab>

            <Tab eventKey="patterns" title={
              <span><i className="bi bi-grid-3x3 me-2"></i>Patrones</span>
            }>
              {activeTab === 'patterns' && (
                <div className="p-4">
                  <Row className="g-4">
                    <Col xs={12}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">
                              <i className="bi bi-grid-3x3 me-2" style={{ color: '#06b6d4' }}></i>
                              Mapa de Calor de Gastos por Semana
                            </span>
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => exportToCSV(heatmapData?.heatmap || [], 'spending_heatmap.csv')}
                              style={{ borderRadius: '8px', fontSize: '0.8125rem' }}
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
                </div>
              )}
            </Tab>

            <Tab eventKey="accounts" title={
              <span><i className="bi bi-wallet2 me-2"></i>Cuentas</span>
            }>
              {activeTab === 'accounts' && (
                <div className="p-4">
                  <Row className="g-4">
                    <Col xs={12}>
                      <Card style={cardStyle}>
                        <Card.Header style={{
                          background: 'transparent',
                          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)'}`,
                          padding: '1.25rem',
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">
                              <i className="bi bi-wallet2 me-2" style={{ color: '#10b981' }}></i>
                              Rendimiento de Cuentas
                            </span>
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => exportToCSV(accountData?.accounts || [], 'account_performance.csv')}
                              style={{ borderRadius: '8px', fontSize: '0.8125rem' }}
                            >
                              <i className="bi bi-download me-1"></i>
                              Exportar
                            </Button>
                          </div>
                        </Card.Header>
                        <Card.Body>
                          {accountData && accountData.accounts && accountData.accounts.length > 0 ? (
                            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                                  {accountData.accounts && Array.isArray(accountData.accounts) && accountData.accounts.map((acc, idx) => (
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
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Analytics;
