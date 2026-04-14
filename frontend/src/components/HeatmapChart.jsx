import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';

/**
 * HeatmapChart - Spending pattern heatmap (day of week vs week number)
 * Props:
 *   - data: { heatmap: [], columns: [] }
 */
const HeatmapChart = ({ data }) => {
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

  if (!data || !data.heatmap || data.heatmap.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
        <i className="bi bi-grid-3x3" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        <p className="mt-3 mb-1" style={{ fontSize: '1rem', fontWeight: 500 }}>
          No hay datos de patrones de gasto disponibles
        </p>
        <small style={{ opacity: 0.6 }}>
          {!data ? 'Cargando datos...' : 'No hay gastos en el período seleccionado.'}
        </small>
      </div>
    );
  }

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNames = {
    Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
    Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
  };

  // Calculate min/max for color scaling
  const allValues = data.heatmap.flatMap(row =>
    data.columns.map(col => row[col] || 0)
  ).filter(v => v > 0);

  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 1);

  // Better color gradient based on spending intensity
  const getCellColor = (value) => {
    if (value === 0) return isDark ? '#0f172a' : '#f8fafc';

    const normalized = (value - minValue) / (maxValue - minValue || 1);

    if (isDark) {
      // Dark mode: Smooth gradient from dark to bright pink
      // Low spending: dark muted purple -> High spending: bright pink (#f472b6)
      // Start: rgb(30, 15, 40) very dark -> End: rgb(244, 114, 182) bright pink
      const r = Math.round(30 + normalized * 214);
      const g = Math.round(15 + normalized * 99);
      const b = Math.round(40 + normalized * 142);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light mode: Blue gradient from light to deep
      const r = Math.round(191 - normalized * 162);
      const g = Math.round(219 - normalized * 141);
      const b = Math.round(254 - normalized * 38);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const getTextColor = (value) => {
    if (value === 0) return isDark ? '#475569' : '#94a3b8';
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    // Dark mode: white text for medium+ values
    // Light mode: white for high, dark for low
    if (isDark) {
      return normalized > 0.3 ? '#ffffff' : '#e2e8f0';
    }
    return normalized > 0.5 ? '#ffffff' : '#1e293b';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      {/* Custom styles for heatmap cells */}
      <style>{`
        .heatmap-cell {
          transition: all 0.2s ease;
          font-size: 0.8125rem;
          cursor: pointer;
        }
        .heatmap-cell:hover {
          transform: scale(1.05);
          z-index: 1;
          box-shadow: 0 0 12px rgba(255,255,255,0.3);
          position: relative;
        }
        /* Force cell colors with !important to override Bootstrap */
        table.table td.heatmap-cell {
          background-color: var(--cell-bg) !important;
          color: var(--cell-color) !important;
        }
      `}</style>
      <div className="table-responsive">
        <Table bordered size="sm" className="text-center mb-0" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <thead>
          <tr>
            <th style={{ 
              minWidth: '100px', 
              background: isDark ? '#0f172a' : '#f1f5f9', 
              color: isDark ? '#e2e8f0' : '#0f172a', 
              borderColor: isDark ? '#334155' : '#e2e8f0',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}>
              Día
            </th>
            {data.columns.map((week, idx) => (
              <th key={idx} style={{ 
                minWidth: '80px', 
                background: isDark ? '#0f172a' : '#f1f5f9', 
                color: isDark ? '#e2e8f0' : '#0f172a', 
                borderColor: isDark ? '#334155' : '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}>
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
                <td className="fw-semibold" style={{
                  backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                  color: isDark ? '#e2e8f0' : '#0f172a',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  fontSize: '0.875rem',
                }}>
                  {dayNames[day]}
                </td>
                {data.columns.map((week, idx) => {
                  const value = rowData[week] || 0;
                  const bgColor = getCellColor(value);
                  const textColor = getTextColor(value);
                  return (
                    <td
                      key={idx}
                      className="heatmap-cell"
                      style={{
                        '--cell-bg': bgColor,
                        '--cell-color': textColor,
                        fontWeight: value > 0 ? '700' : 'normal',
                        borderColor: isDark ? '#1e293b' : '#e2e8f0',
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
      
      {/* Color Legend */}
      <div className="d-flex align-items-center justify-content-center gap-2 mt-3" style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
        <span>Menor gasto</span>
        <div style={{
          display: 'flex',
          gap: '2px',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              style={{
                width: '24px',
                height: '16px',
                backgroundColor: getCellColor(minValue + level * (maxValue - minValue)),
              }}
            />
          ))}
        </div>
        <span>Mayor gasto</span>
      </div>
    </div>
    </>
  );
};

export default HeatmapChart;
