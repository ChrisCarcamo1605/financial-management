import React from 'react';

const CircularProgress = ({
  value,
  size = 80,
  strokeWidth = 8,
  color = 'var(--primary-600)',
  bgColor = 'var(--slate-200)',
  showLabel = true,
  label,
  className = ''
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safeValue / 100) * circumference;

  const getColor = (val) => {
    if (val > 90) return '#e11d48';
    if (val > 70) return '#d97706';
    return '#059669';
  };

  const solidColorMap = {
    primary: '#1d6ef1',
    success: '#059669',
    danger: '#e11d48',
    warning: '#d97706',
    info: '#2563eb',
  };

  const activeColor = color === 'auto' ? getColor(safeValue) : (solidColorMap[color] || color);
  const solidBgColor = 'var(--slate-200)'; /* #e2e8f0 light / #334155 dark via CSS var inversion */

  return (
    <div className={`d-flex flex-column align-items-center ${className}`}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            style={{ stroke: solidBgColor, strokeWidth }}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            style={{ stroke: activeColor, strokeWidth, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        
        {showLabel && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <span 
              className="mono fw-bold"
              style={{ fontSize: size * 0.2, color: activeColor }}
            >
              {Math.round(value)}%
            </span>
          </div>
        )}
      </div>
      
      {label && (
        <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.75rem' }}>
          {label}
        </p>
      )}
    </div>
  );
};

export default CircularProgress;
