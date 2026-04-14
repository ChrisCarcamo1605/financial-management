import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

/**
 * TrendChart - Line chart with trend lines and moving averages
 * Props:
 *   - data: { trends: [], insights: {} }
 *   - window: moving average window size
 */
const TrendChart = ({ data, window = 3 }) => {
  if (!data || !data.trends || data.trends.length === 0) {
    return <div className="text-center py-5 text-muted">No hay datos de tendencias disponibles</div>;
  }

  const labels = data.trends.map(t => {
    const date = new Date(t.date);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: data.trends.map(t => t.income || 0),
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: `Ingresos (MA${window})`,
        data: data.trends.map(t => t[`income_ma${window}`] || t.income || 0),
        borderColor: 'rgba(40, 167, 69, 0.5)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Gastos',
        data: data.trends.map(t => t.expense || 0),
        borderColor: 'rgba(220, 53, 69, 1)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: `Gastos (MA${window})`,
        data: data.trends.map(t => t[`expense_ma${window}`] || t.expense || 0),
        borderColor: 'rgba(220, 53, 69, 0.5)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Flujo Neto',
        data: data.trends.map(t => t.net || 0),
        borderColor: 'rgba(0, 123, 255, 1)',
        backgroundColor: 'rgba(0, 123, 255, 0.05)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
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
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default TrendChart;
