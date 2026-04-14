import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * WaterfallChart - Cash flow waterfall visualization
 * Props:
 *   - data: { cash_flow: [], summary: {} }
 */
const WaterfallChart = ({ data }) => {
  if (!data || !data.cash_flow || data.cash_flow.length === 0) {
    return <div className="text-center py-5 text-muted">No hay datos de flujo de caja disponibles</div>;
  }

  // Take last 12 periods for better visualization
  const recentData = data.cash_flow.slice(-12);

  const labels = recentData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: recentData.map(d => d.income || 0),
        backgroundColor: 'rgba(40, 167, 69, 0.8)',
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Gastos',
        data: recentData.map(d => -(d.expense || 0)),
        backgroundColor: 'rgba(220, 53, 69, 0.8)',
        borderColor: 'rgba(220, 53, 69, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Flujo Neto',
        data: recentData.map(d => (d.net || 0)),
        backgroundColor: recentData.map(d => 
          (d.net || 0) >= 0 ? 'rgba(0, 123, 255, 0.8)' : 'rgba(255, 193, 7, 0.8)'
        ),
        borderColor: recentData.map(d => 
          (d.net || 0) >= 0 ? 'rgba(0, 123, 255, 1)' : 'rgba(255, 193, 7, 1)'
        ),
        borderWidth: 1,
        borderRadius: 4,
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
            const value = Math.abs(context.parsed.y);
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(value);
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
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
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default WaterfallChart;
