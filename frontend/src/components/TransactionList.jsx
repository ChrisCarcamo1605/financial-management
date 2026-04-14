import React from 'react';
import { Table, Button, Badge } from 'react-bootstrap';

const TransactionList = ({ transactions, onEdit, onDelete }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">No hay transacciones</p>
      </div>
    );
  }

  return (
    <div className="table-responsive-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
      <Table responsive hover>
        <thead className="sticky-top">
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Cuenta</th>
            <th className="text-end">Monto</th>
            <th className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(transactions) && transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="text-nowrap">{formatDate(transaction.date)}</td>
              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {transaction.description || '-'}
              </td>
              <td>
                <Badge bg={transaction.type === 'income' ? 'success' : 'danger'}>
                  {transaction.category_name || 'Sin categoría'}
                </Badge>
              </td>
              <td>{transaction.account_name || '-'}</td>
              <td className="text-end text-nowrap">
                <span
                  className="mono fw-bold"
                  style={{
                    color: transaction.type === 'income' ? 'var(--success-600)' : 'var(--danger-600)',
                  }}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </td>
              <td className="text-center text-nowrap">
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-1"
                  onClick={() => onEdit(transaction)}
                >
                  <i className="bi bi-pencil"></i>
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onDelete(transaction.id)}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default TransactionList;
