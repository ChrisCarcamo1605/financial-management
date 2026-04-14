import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

/**
 * WaterfallChart - Cash flow waterfall visualization
 * Props:
 *   - data: { cash_flow: [], summary: {} }
 */
const WaterfallChart = ({ data }) => {
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

  if (!data || !data.cash_flow || !Array.isArray(data.cash_flow) || data.cash_flow.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: textColor }}>
        <i className="bi bi-cash-flow" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        <p className="mt-3 mb-1" style={{ fontSize: '1rem', fontWeight: 500 }}>
          No hay datos de flujo de caja disponibles
        </p>
        <small style={{ opacity: 0.6 }}>
          {!data ? 'Cargando datos...' : 'No hay transacciones en el período seleccionado.'}
        </small>
      </div>
    );
  }

  // Smart slicing based on data length
  const maxPoints = data.cash_flow.length > 24 ? 24 : data.cash_flow.length;
  const recentData = data.cash_flow.slice(-maxPoints);
  const labels = recentData.map(d => {
    const date = new Date(d.date);
    // Dynamic label format based on data density
    if (recentData.length > 14) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: recentData.map(d => d.income || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Gastos',
        data: recentData.map(d => -(d.expense || 0)),
        backgroundColor: 'rgba(244, 63, 94, 0.85)',
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Flujo Neto',
        data: recentData.map(d => (d.net || 0)),
        backgroundColor: recentData.map(d =>
          (d.net || 0) >= 0 ? 'rgba(51, 141, 252, 0.85)' : 'rgba(245, 158, 11, 0.85)'
        ),
        borderColor: recentData.map(d =>
          (d.net || 0) >= 0 ? '#338dfc' : '#f59e0b'
        ),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
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
            const value = Math.abs(context.parsed.y);
            label += new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value);
            return label;
          },
        },
      },
    },
    scales: {
      y: {
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
      x: {
        grid: { display: false },
        ticks: { 
          font: { family: 'Outfit, -apple-system, sans-serif', size: 12, weight: '500' }, 
          color: textColor,
          padding: 8,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default WaterfallChart;
