import React from 'react';
import { Card, Button } from 'react-bootstrap';

const EmptyState = ({ 
  icon = 'inbox', 
  title = 'No hay datos disponibles', 
  description = 'Comienza agregando tu primer registro', 
  actionLabel, 
  onAction,
  illustration 
}) => {
  return (
    <Card className="text-center py-5 animate-fade-in">
      <Card.Body>
        {illustration ? (
          <div className="mb-4" style={{ maxWidth: '200px', margin: '0 auto' }}>
            {illustration}
          </div>
        ) : (
          <div 
            className="mb-4 d-flex align-items-center justify-content-center"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'var(--slate-100)',
              margin: '0 auto',
            }}
          >
            <i 
              className={`bi bi-${icon}`}
              style={{ 
                fontSize: '3rem', 
                color: 'var(--slate-400)' 
              }}
            ></i>
          </div>
        )}
        
        <h4 className="mb-2" style={{ fontWeight: 600 }}>{title}</h4>
        <p className="text-muted mb-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
          {description}
        </p>
        
        {actionLabel && onAction && (
          <Button 
            variant="primary" 
            onClick={onAction}
            className="animate-scale-in"
          >
            <i className={`bi bi-plus-circle me-2`}></i>
            {actionLabel}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default EmptyState;
