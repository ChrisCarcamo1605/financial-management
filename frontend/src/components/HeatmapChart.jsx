import React from 'react';
import { Table, Badge } from 'react-bootstrap';

/**
 * HeatmapChart - Spending pattern heatmap (day of week vs week number)
 * Props:
 *   - data: { heatmap: [], columns: [] }
 */
const HeatmapChart = ({ data }) => {
  if (!data || !data.heatmap || data.heatmap.length === 0) {
    return <div className="text-center py-5 text-muted">No hay datos de patrones de gasto disponibles</div>;
  }

  // Day order for display
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNames = {
    Monday: 'Lunes',
    Tuesday: 'Martes',
    Wednesday: 'Miércoles',
    Thursday: 'Jueves',
    Friday: 'Viernes',
    Saturday: 'Sábado',
    Sunday: 'Domingo',
  };

  // Find min and max values for color scaling
  const allValues = data.heatmap.flatMap(row => 
    data.columns.map(col => row[col] || 0)
  ).filter(v => v > 0);

  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 1);

  // Color interpolation function
  const getCellColor = (value) => {
    if (value === 0) return 'rgba(248, 249, 250, 1)';
    
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    
    // Color gradient from light blue to dark blue
    const red = Math.round(220 - normalized * 180);
    const green = Math.round(230 - normalized * 150);
    const blue = Math.round(245 - normalized * 50);
    
    return `rgba(${red}, ${green}, ${blue}, ${0.3 + normalized * 0.7})`;
  };

  const getTextColor = (value) => {
    if (value === 0) return '#6c757d';
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    return normalized > 0.5 ? '#fff' : '#212529';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="table-responsive">
      <Table bordered hover size="sm" className="text-center mb-0">
        <thead>
          <tr>
            <th style={{ minWidth: '100px' }}>Día</th>
            {data.columns.map((week, idx) => (
              <th key={idx} style={{ minWidth: '80px' }}>
                Semana {week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dayOrder.map(day => {
            const rowData = data.heatmap.find(row => row.day === day);
            if (!rowData) return null;

            return (
              <tr key={day}>
                <td className="fw-bold" style={{ backgroundColor: '#f8f9fa' }}>
                  {dayNames[day]}
                </td>
                {data.columns.map((week, idx) => {
                  const value = rowData[week] || 0;
                  return (
                    <td
                      key={idx}
                      style={{
                        backgroundColor: getCellColor(value),
                        color: getTextColor(value),
                        fontWeight: value > 0 ? 'bold' : 'normal',
                        cursor: 'pointer',
                      }}
                      title={`${dayNames[day]} - Semana ${week}: ${formatCurrency(value)}`}
                    >
                      {value > 0 ? formatCurrency(value) : '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default HeatmapChart;
