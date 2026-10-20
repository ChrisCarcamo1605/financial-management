import { Landmark, Repeat } from 'lucide-react';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import type { Transaction } from '@/data/types';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';

interface TransactionRowProps {
  transaction: Transaction;
  onSelect?(transaction: Transaction): void;
  /** Texto secundario; por defecto categoría y cuenta. */
  meta?: string;
  className?: string;
}

/** Fila de movimiento reutilizable (listas, dashboard, presupuestos). */
export function TransactionRow({ transaction: tx, onSelect, meta, className }: TransactionRowProps) {
  const t = useT().transactions;
  const title = tx.description || tx.category_name || t.fallbackTitle;
  const signed = tx.type === 'income' ? tx.amount : -tx.amount;
  const content = (
    <>
      <IconBadge icon={tx.category_icon} color={tx.category_color} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{title}</span>
          {tx.recurring_service_id && <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-label={t.recurringAria} />}
          {tx.loan_id && <Landmark className="size-3.5 shrink-0 text-muted-foreground" aria-label={t.loanAria} />}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {meta ?? (tx.description && tx.category_name && tx.account_name ? t.metaIn(tx.category_name, tx.account_name) : tx.account_name)}
        </span>
      </span>
      <Money value={signed} signed tone={tx.type === 'income' ? 'inflow' : 'neutral'} className="text-sm font-medium" />
    </>
  );

  const base = 'flex w-full items-center gap-3 px-4 py-2.5 text-left md:px-5';
  if (!onSelect) return <div className={cn(base, className)}>{content}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(tx)}
      className={cn(base, 'transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none', className)}
    >
      {content}
    </button>
  );
}
