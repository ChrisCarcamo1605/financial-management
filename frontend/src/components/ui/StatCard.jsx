import React from 'react';
import { Card } from 'react-bootstrap';
import CountUp from 'react-countup';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  trend, 
  trendValue, 
  prefix = '', 
  suffix = '',
  className = '',
  animate = true 
}) => {
  const colorMap = {
    primary: {
      bg: 'var(--primary-50)',
      text: 'var(--primary-600)',
      gradient: 'var(--gradient-primary)',
      shadow: '0 4px 12px rgba(51, 141, 252, 0.15)',
    },
    success: {
      bg: 'var(--success-50)',
      text: 'var(--success-600)',
      gradient: 'var(--gradient-success)',
      shadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
    },
    danger: {
      bg: 'var(--danger-50)',
      text: 'var(--danger-600)',
      gradient: 'var(--gradient-danger)',
      shadow: '0 4px 12px rgba(244, 63, 94, 0.15)',
    },
    warning: {
      bg: 'var(--warning-50)',
      text: 'var(--warning-600)',
      gradient: 'var(--gradient-warning)',
      shadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
    },
    info: {
      bg: 'var(--info-50)',
      text: 'var(--info-600)',
      gradient: 'var(--gradient-primary)',
      shadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
    },
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <Card 
      className={`h-100 ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxShadow: colors.shadow,
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: colors.gradient,
          borderRadius: '50%',
          opacity: 0.1,
        }}
      />

      <Card.Body>
        <div className="d-flex align-items-start justify-content-between">
          <div style={{ flex: 1 }}>
            <p className="text-muted mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {title}
            </p>
            
            <h3 className="mb-2 mono" style={{ fontWeight: 700 }}>
              {animate ? (
                <CountUp end={typeof value === 'number' ? value : 0} duration={2} separator="," prefix={prefix} suffix={suffix} />
              ) : (
                <>
                  {prefix}
                  {typeof value === 'number' ? value.toLocaleString() : value}
                  {suffix}
                </>
              )}
            </h3>

            {trend && (
              <div className="d-flex align-items-center" style={{ fontSize: '0.8125rem' }}>
                {trend === 'up' ? (
                  <span style={{ color: 'var(--success-600)' }}>
                    <i className="bi bi-arrow-up-short"></i>
                    {trendValue}%
                  </span>
                ) : (
                  <span style={{ color: 'var(--danger-600)' }}>
                    <i className="bi bi-arrow-down-short"></i>
                    {trendValue}%
                  </span>
                )}
                <span className="text-muted ms-1">vs mes anterior</span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              background: colors.bg,
              color: colors.text,
              fontSize: '1.5rem',
              boxShadow: `inset 0 0 0 2px ${colors.text}20`,
            }}
          >
            <i className={`bi bi-${icon}`}></i>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StatCard;
