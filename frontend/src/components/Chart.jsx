import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const Chart = ({ type, data, options }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const chartOptions = { ...defaultOptions, ...options };

  switch (type) {
    case 'bar':
      return <Bar data={data} options={chartOptions} />;
    case 'line':
      return <Line data={data} options={chartOptions} />;
    case 'doughnut':
      return <Doughnut data={data} options={chartOptions} />;
    default:
      return <Bar data={data} options={chartOptions} />;
  }
};

export default Chart;
