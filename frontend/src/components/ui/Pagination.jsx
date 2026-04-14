import React, { useState, useCallback } from 'react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  perPage,
  showInfo = true
}) => {
  const [jumpPage, setJumpPage] = useState('');

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(
          1,
          '...',
          currentPage - 1,
          currentPage,
          currentPage + 1,
          '...',
          totalPages
        );
      }
    }

    return pages;
  };

  const handleJump = useCallback(() => {
    const page = parseInt(jumpPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpPage('');
    }
  }, [jumpPage, totalPages, onPageChange]);

  const handleJumpKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  }, [handleJump]);

  return (
    <div className="pagination-container">
      <div className="pagination-card">
        {/* Info */}
        {showInfo && (
          <div className="pagination-info">
            <i className="bi bi-database info-icon"></i>
            <span>
              Mostrando{' '}
              <span className="info-count">{startItem}-{endItem}</span>{' '}
              de{' '}
              <span className="badge-count">{totalItems}</span>
            </span>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="pagination-controls">
          {/* First Page */}
          <button
            className="page-btn nav-btn"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primera página"
            aria-label="Primera página"
          >
            <i className="bi bi-chevron-double-left"></i>
          </button>

          {/* Previous */}
          <button
            className="page-btn nav-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
            aria-label="Página anterior"
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="page-ellipsis">
                ···
              </span>
            ) : (
              <button
                key={`page-${page}`}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
                title={`Ir a página ${page}`}
                aria-label={`Ir a página ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )
          ))}

          {/* Next */}
          <button
            className="page-btn nav-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Página siguiente"
            aria-label="Página siguiente"
          >
            <i className="bi bi-chevron-right"></i>
          </button>

          {/* Last Page */}
          <button
            className="page-btn nav-btn"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Última página"
            aria-label="Última página"
          >
            <i className="bi bi-chevron-double-right"></i>
          </button>
        </div>

        <div className="pagination-divider" />

        {/* Jump to Page */}
        <div className="pagination-jump">
          <span>Ir a:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={handleJumpKeyDown}
            onBlur={handleJump}
            placeholder="#"
            aria-label="Número de página"
          />
        </div>
      </div>
    </div>
  );
};

export default Pagination;
