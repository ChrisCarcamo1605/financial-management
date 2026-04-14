import React from 'react';

const PageHeader = ({ title, subtitle, icon, actions, breadcrumbs }) => {
  return (
    <div className="mb-4 animate-fade-in-up">
      {breadcrumbs && (
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb" style={{ fontSize: '0.875rem' }}>
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}>
                {index < breadcrumbs.length - 1 ? (
                  <a href={crumb.link} className="text-decoration-none" style={{ color: 'var(--primary-600)' }}>
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-muted">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          {icon && (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--gradient-primary)',
                color: 'white',
                fontSize: '1.25rem',
                boxShadow: '0 4px 12px rgba(51, 141, 252, 0.3)',
              }}
            >
              <i className={`bi bi-${icon}`}></i>
            </div>
          )}
          
          <div>
            <h2 className="mb-1" style={{ fontWeight: 700 }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted mb-0" style={{ fontSize: '0.9375rem' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="d-flex gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
