import React from 'react';

const TrendIndicator = ({ trend, value, label, size = 'sm' }) => {
  const isPositive = trend === 'up';
  const color = isPositive ? 'var(--success-600)' : 'var(--danger-600)';
  const bgColor = isPositive ? 'var(--success-50)' : 'var(--danger-50)';
  const icon = isPositive ? 'bi-arrow-up-short' : 'bi-arrow-down-short';
  
  const sizeMap = {
    sm: { fontSize: '0.75rem', padding: '0.25rem 0.5rem' },
    md: { fontSize: '0.875rem', padding: '0.375rem 0.75rem' },
    lg: { fontSize: '1rem', padding: '0.5rem 1rem' },
  };

  const sizes = sizeMap[size];

  return (
    <div 
      className="d-inline-flex align-items-center gap-1"
      style={{
        fontSize: sizes.fontSize,
        padding: sizes.padding,
        borderRadius: 'var(--radius-full)',
        backgroundColor: bgColor,
        color: color,
        fontWeight: 600,
      }}
    >
      <i className={`bi ${icon}`}></i>
      <span>{value}%</span>
      {label && <span className="text-muted ms-1 fw-normal">{label}</span>}
    </div>
  );
};

export default TrendIndicator;
