import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

/**
 * ComparisonChart - Category comparison chart
 * Props:
 *   - data: { comparison: [] }
 */
const ComparisonChart = ({ data }) => {
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

  if (!data || !data.comparison || data.comparison.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: textColor }}>
        <i className="bi bi-bar-chart" style={{ fontSize: '2.5rem', opacity: 0.5 }}></i>
        <p className="mt-2">No hay datos de comparación disponibles</p>
      </div>
    );
  }

  const topCategories = data.comparison.slice(0, 10);
  const labels = topCategories.map(c => c.category_name || 'Sin categoría');

  const colors = [
    'rgba(51, 141, 252, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(245, 158, 11, 0.85)',
    'rgba(139, 92, 246, 0.85)', 'rgba(20, 184, 166, 0.85)', 'rgba(249, 115, 22, 0.85)',
    'rgba(236, 72, 153, 0.85)', 'rgba(244, 63, 94, 0.85)', 'rgba(100, 116, 139, 0.85)',
    'rgba(148, 163, 184, 0.85)',
  ];
  const borders = [
    '#338dfc', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6',
    '#f97316', '#ec4899', '#f43f5e', '#64748b', '#94a3b8',
  ];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Gasto Total',
        data: topCategories.map(c => c.current_amount),
        backgroundColor: colors.slice(0, topCategories.length),
        borderColor: borders.slice(0, topCategories.length),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.97)',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#475569' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: 'Outfit', size: 13, weight: '600' },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const value = context.parsed.x;
            const category = topCategories[context.dataIndex];
            return [
              `Monto: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}`,
              `Transacciones: ${category.current_count}`,
              `Promedio: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / (category.current_count || 1))}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderDash: [4, 4], drawBorder: false },
        ticks: {
          font: { family: 'JetBrains Mono', size: 11 },
          color: textColor,
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
      y: {
        grid: { display: false },
        ticks: { font: { family: 'Outfit', size: 12, weight: '500' }, color: textColor },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default ComparisonChart;
