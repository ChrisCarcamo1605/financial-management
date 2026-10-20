import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Transaction, TxType } from '@/data/types';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { TransferForm } from '@/features/accounts/transfer-form';

interface TransferPreset {
  toAccountId?: number;
  amount?: number;
}

interface QuickActions {
  newTransaction(type?: TxType): void;
  /** Registrar un cobro de una fuente de ingreso con el monto ya calculado. */
  newIncomeFrom(incomeSourceId: number): void;
  editTransaction(transaction: Transaction): void;
  newTransfer(preset?: TransferPreset): void;
}

const QuickActionsContext = createContext<QuickActions | null>(null);

/** Formularios globales (registrar/editar movimiento, transferir) accesibles desde cualquier pantalla. */
export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState<TxType>('expense');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [incomeSourceId, setIncomeSourceId] = useState<number | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPreset, setTransferPreset] = useState<TransferPreset>({});

  const newTransaction = useCallback((type: TxType = 'expense') => {
    setEditing(null);
    setIncomeSourceId(null);
    setTxType(type);
    setTxOpen(true);
  }, []);
  const newIncomeFrom = useCallback((sourceId: number) => {
    setEditing(null);
    setIncomeSourceId(sourceId);
    setTxType('income');
    setTxOpen(true);
  }, []);
  const editTransaction = useCallback((transaction: Transaction) => {
    setEditing(transaction);
    setTxOpen(true);
  }, []);
  const newTransfer = useCallback((preset: TransferPreset = {}) => {
    setTransferPreset(preset);
    setTransferOpen(true);
  }, []);

  const value = useMemo(
    () => ({ newTransaction, newIncomeFrom, editTransaction, newTransfer }),
    [newTransaction, newIncomeFrom, editTransaction, newTransfer],
  );

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <TransactionForm open={txOpen} onOpenChange={setTxOpen} transaction={editing} defaultType={txType} incomeSourceId={incomeSourceId} />
      <TransferForm open={transferOpen} onOpenChange={setTransferOpen} {...transferPreset} />
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const context = useContext(QuickActionsContext);
  if (!context) throw new Error('useQuickActions must be used within QuickActionsProvider');
  return context;
}
