import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin
);

const colors = [
  { bg: 'rgba(51, 141, 252, 0.85)', border: '#338dfc', fill: 'rgba(51, 141, 252, 0.15)' },
  { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981', fill: 'rgba(16, 185, 129, 0.15)' },
  { bg: 'rgba(245, 158, 11, 0.85)', border: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)' },
  { bg: 'rgba(139, 92, 246, 0.85)', border: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)' },
  { bg: 'rgba(20, 184, 166, 0.85)', border: '#14b8a6', fill: 'rgba(20, 184, 166, 0.15)' },
  { bg: 'rgba(249, 115, 22, 0.85)', border: '#f97316', fill: 'rgba(249, 115, 22, 0.15)' },
  { bg: 'rgba(236, 72, 153, 0.85)', border: '#ec4899', fill: 'rgba(236, 72, 153, 0.15)' },
  { bg: 'rgba(244, 63, 94, 0.85)', border: '#f43f5e', fill: 'rgba(244, 63, 94, 0.15)' },
];

function getChartOptions(isDark) {
  const text = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { family: 'Outfit', size: 12, weight: '500' },
          color: text,
        }
      },
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
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Outfit', size: 12, weight: '500' }, color: text },
      },
      y: {
        beginAtZero: true,
        grid: { color: grid, borderDash: [4, 4], drawBorder: false },
        ticks: { font: { family: 'JetBrains Mono', size: 11 }, color: text },
        border: { display: false },
      }
    },
  };
}

const Chart = ({ type, data, options, enableZoom = false }) => {
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

  if (!data || !data.datasets) return null;

  const chartOptions = getChartOptions(isDark);

  const processedData = {
    ...data,
    datasets: data.datasets.map((ds, i) => {
      const c = colors[i % colors.length];
      const base = { ...ds };

      if (type === 'bar') {
        return {
          ...base,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
          backgroundColor: base.backgroundColor || c.bg,
          borderColor: base.borderColor || c.border,
          borderWidth: 2,
        };
      }

      if (type === 'line') {
        return {
          ...base,
          fill: base.fill !== false,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: base.borderColor || c.border,
          pointHoverBorderColor: isDark ? '#1e293b' : '#fff',
          pointHoverBorderWidth: 3,
          borderColor: base.borderColor || c.border,
          backgroundColor: base.fill === false
            ? 'transparent'
            : (base.backgroundColor || c.fill),
        };
      }

      if (type === 'doughnut') {
        return {
          ...base,
          backgroundColor: base.backgroundColor || colors.map(cl => cl.bg),
          borderColor: isDark ? '#1e293b' : '#fff',
          borderWidth: 3,
          hoverOffset: 6,
          spacing: 2,
        };
      }

      return base;
    }),
  };

  if (enableZoom) {
    chartOptions.plugins.zoom = {
      zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' },
      pan: { enabled: true, mode: 'xy' },
    };
  }

  const finalOptions = { ...chartOptions, ...options };

  switch (type) {
    case 'bar': return <Bar data={processedData} options={finalOptions} />;
    case 'line': return <Line data={processedData} options={finalOptions} />;
    case 'doughnut': return <Doughnut data={processedData} options={finalOptions} />;
    default: return <Bar data={processedData} options={finalOptions} />;
  }
};

export default Chart;
