import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

/**
 * TrendChart - Line chart with trend lines and moving averages
 * Props:
 *   - data: { trends: [], insights: {} }
 *   - window: moving average window size
 */
const TrendChart = ({ data, window = 3 }) => {
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
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  // Parse data if it's a string (handle double-encoded JSON)
  const parsedData = React.useMemo(() => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse trend data:', e);
        return null;
      }
    }
    return data;
  }, [data]);

  // Debug: Log data structure
  console.log('TrendChart received data:', parsedData);
  console.log('TrendChart raw data type:', typeof data);
  console.log('TrendChart trends:', parsedData?.trends);
  console.log('TrendChart insights:', parsedData?.insights);

  // Check if trends data is valid
  const hasTrends = parsedData && parsedData.trends && Array.isArray(parsedData.trends) && parsedData.trends.length > 0;
  
  if (!hasTrends) {
    return (
      <div className="text-center py-5" style={{ color: textColor }}>
        <i className="bi bi-graph-up" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        <p className="mt-3 mb-1" style={{ fontSize: '1rem', fontWeight: 500 }}>
          No hay datos de tendencias disponibles
        </p>
        <small style={{ opacity: 0.6 }}>
          {parsedData
            ? 'Hay insights pero no hay suficientes datos para generar tendencias.'
            : 'No se recibieron datos del servidor.'}
        </small>
      </div>
    );
  }

  // Smart slicing - show all data points up to 24
  const trendsData = parsedData.trends.length > 24 
    ? parsedData.trends.slice(-24) 
    : parsedData.trends;
  
  const labels = trendsData.map(t => {
    const date = new Date(t.date);
    // Dynamic label format based on data density
    if (trendsData.length > 14) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: trendsData.map(t => t.income || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#10b981',
        pointBorderColor: isDark ? '#1e293b' : '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: `Ingresos (MA${window})`,
        data: trendsData.map(t => t[`income_ma${window}`] || t.income || 0),
        borderColor: 'rgba(16, 185, 129, 0.4)',
        borderDash: [6, 4],
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Gastos',
        data: trendsData.map(t => t.expense || 0),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#f43f5e',
        pointBorderColor: isDark ? '#1e293b' : '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: `Gastos (MA${window})`,
        data: trendsData.map(t => t[`expense_ma${window}`] || t.expense || 0),
        borderColor: 'rgba(244, 63, 94, 0.4)',
        borderDash: [6, 4],
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Flujo Neto',
        data: trendsData.map(t => t.net || 0),
        borderColor: '#338dfc',
        backgroundColor: 'rgba(51, 141, 252, 0.08)',
        fill: false,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#338dfc',
        pointBorderColor: isDark ? '#1e293b' : '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { family: 'Outfit, -apple-system, sans-serif', size: 12, weight: '500' },
          color: textColor,
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 12,
        titleFont: { family: 'Outfit, -apple-system, sans-serif', size: 13, weight: '600' },
        bodyFont: { family: 'JetBrains Mono, monospace', size: 12 },
        boxPadding: 6,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          font: { family: 'Outfit, -apple-system, sans-serif', size: 12, weight: '500' }, 
          color: textColor,
          padding: 8,
        },
      },
      y: {
        beginAtZero: false,
        grid: { 
          color: gridColor, 
          borderDash: [4, 4], 
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          color: textColor,
          padding: 12,
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
        border: { display: false },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default TrendChart;
