import React from 'react';
import { Card } from 'react-bootstrap';

const LoadingSkeleton = ({ type = 'card', count = 1 }) => {
  const skeletons = [];

  const CardSkeleton = ({ index }) => (
    <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
      <Card.Body>
        <div className="d-flex align-items-start gap-3 mb-3">
          <div 
            className="animate-shimmer"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div 
              className="animate-shimmer mb-2"
              style={{
                height: '18px',
                width: '60%',
                borderRadius: 'var(--radius-md)',
                backgroundSize: '200% 100%',
              }}
            />
            <div 
              className="animate-shimmer"
              style={{
                height: '14px',
                width: '40%',
                borderRadius: 'var(--radius-md)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>
        <div 
          className="animate-shimmer"
          style={{
            height: '8px',
            width: '100%',
            borderRadius: 'var(--radius-full)',
            backgroundSize: '200% 100%',
          }}
        />
      </Card.Body>
    </Card>
  );

  const StatCardSkeleton = ({ index }) => (
    <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div 
              className="animate-shimmer mb-2"
              style={{
                height: '14px',
                width: '80px',
                borderRadius: 'var(--radius-md)',
                backgroundSize: '200% 100%',
              }}
            />
            <div 
              className="animate-shimmer"
              style={{
                height: '32px',
                width: '120px',
                borderRadius: 'var(--radius-md)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
          <div 
            className="animate-shimmer"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </Card.Body>
    </Card>
  );

  const TableSkeleton = ({ index }) => (
    <div key={index} className="d-flex align-items-center gap-3 py-3 border-bottom">
      <div 
        className="animate-shimmer"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundSize: '200% 100%',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div 
          className="animate-shimmer mb-1"
          style={{
            height: '14px',
            width: '60%',
            borderRadius: 'var(--radius-md)',
            backgroundSize: '200% 100%',
          }}
        />
        <div 
          className="animate-shimmer"
          style={{
            height: '12px',
            width: '40%',
            borderRadius: 'var(--radius-md)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
      <div 
        className="animate-shimmer"
        style={{
          height: '16px',
          width: '80px',
          borderRadius: 'var(--radius-md)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );

  for (let i = 0; i < count; i++) {
    switch (type) {
      case 'stat':
        skeletons.push(<StatCardSkeleton key={i} index={i} />);
        break;
      case 'table':
        skeletons.push(<TableSkeleton key={i} index={i} />);
        break;
      default:
        skeletons.push(<CardSkeleton key={i} index={i} />);
    }
  }

  return <>{skeletons}</>;
};

export default LoadingSkeleton;
