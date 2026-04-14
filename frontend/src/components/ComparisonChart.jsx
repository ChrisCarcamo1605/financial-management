import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * ComparisonChart - Category comparison chart
 * Props:
 *   - data: { comparison: [] }
 */
const ComparisonChart = ({ data }) => {
  if (!data || !data.comparison || data.comparison.length === 0) {
    return <div className="text-center py-5 text-muted">No hay datos de comparación disponibles</div>;
  }

  // Take top 10 categories for better visualization
  const topCategories = data.comparison.slice(0, 10);

  const labels = topCategories.map(c => c.category_name || 'Sin categoría');

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Gasto Total',
        data: topCategories.map(c => c.current_amount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
          'rgba(255, 99, 255, 0.8)',
          'rgba(99, 255, 132, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)',
        ],
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const value = context.parsed.x;
            const category = topCategories[context.dataIndex];
            return [
              `Monto: ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(value)}`,
              `Transacciones: ${category.current_count}`,
              `Promedio: ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(value / category.current_count)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
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
      y: {
        grid: {
          display: false,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default ComparisonChart;
