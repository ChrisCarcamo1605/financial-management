import React from 'react';
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

const Chart = ({ type, data, options, enableZoom = false }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  // Add zoom configuration if enabled
  if (enableZoom) {
    defaultOptions.plugins.zoom = {
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: 'xy',
      },
      pan: {
        enabled: true,
        mode: 'xy',
      },
    };
  }

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
