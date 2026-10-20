import { Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import type { Loan, LoanPayment } from '@/data/types';
import { toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';

interface LoanDetailProps {
  loan: Loan | null;
  onOpenChange(open: boolean): void;
  onAbonar(loan: Loan): void;
  onEdit(loan: Loan): void;
}

/** Calendario de cuotas de un préstamo con acciones para marcarlas pagadas. */
export function LoanDetail({ loan, onOpenChange, onAbonar, onEdit }: LoanDetailProps) {
  const dictionary = useT();
  const t = dictionary.loans;
  return (
    <ResponsiveDialog
      open={loan !== null}
      onOpenChange={onOpenChange}
      title={loan?.name ?? t.detail.fallbackTitle}
      description={loan ? [loan.category_name, loan.account_name && t.detail.paidFrom(loan.account_name)].filter(Boolean).join(', ') || t.detail.schedule : undefined}
      className="sm:max-w-xl"
      footer={loan && (
        <>
          <Button variant="outline" onClick={() => onEdit(loan)} className="sm:mr-auto">{dictionary.common.actions.edit}</Button>
          {loan.status === 'active' && <Button onClick={() => onAbonar(loan)}>{t.card.extraPayment}</Button>}
        </>
      )}
    >
      {loan && <LoanSchedule loan={loan} />}
    </ResponsiveDialog>
  );
}

function LoanSchedule({ loan }: { loan: Loan }) {
  const t = useT().loans.detail;
  const paid = loan.payments.filter((p) => p.status === 'paid');
  const paidCount = paid.length;
  const lastPaid = paid.length ? Math.max(...paid.map((p) => p.installment_number)) : null;
  return (
    <div className="grid gap-4 py-1">
      <dl className="grid grid-cols-3 gap-3 rounded-md border p-3">
        {[
          { label: t.total, value: <Money value={loan.total_amount} /> },
          { label: t.paid, value: <Money value={loan.total_paid} tone="inflow" /> },
          { label: t.remaining, value: <Money value={loan.remaining} /> },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 text-base font-semibold sm:text-xl">{item.value}</dd>
          </div>
        ))}
      </dl>
      {loan.finished_early && (
        <p className="rounded-md bg-accent p-3 text-sm">{t.finishedEarly}</p>
      )}
      <p className="text-sm text-muted-foreground">
        {t.paidCount(paidCount, loan.payments.length)}
        {!loan.account_id || !loan.category_id ? t.assignHint : ''}
      </p>
      <ol className="divide-y rounded-md border">
        {loan.payments.map((payment) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            canPay={Boolean(loan.account_id && loan.category_id)}
            isLastPaid={payment.installment_number === lastPaid}
            amountToPay={dueThrough(loan.payments, payment.installment_number)}
          />
        ))}
      </ol>
    </div>
  );
}

/** Lo que falta por pagar de la cuota indicada y de todas las anteriores pendientes. */
function dueThrough(payments: LoanPayment[], installment: number) {
  return payments
    .filter((p) => p.status === 'pending' && p.installment_number <= installment)
    .reduce((sum, p) => sum + p.amount - p.paid_amount, 0);
}

interface PaymentRowProps {
  payment: LoanPayment;
  canPay: boolean;
  /** Solo la última cuota pagada se puede revertir (se elimina el pago más reciente). */
  isLastPaid: boolean;
  amountToPay: number;
}

function PaymentRow({ payment, canPay, isLastPaid, amountToPay }: PaymentRowProps) {
  const fmt = useFormat();
  const source = useDataSource();
  const confirm = useConfirm();
  const t = useT().loans.payment;
  const partial = payment.status === 'pending' && payment.paid_amount > 0;

  const setStatus = useAppMutation({
    mutationFn: (status: 'paid' | 'pending') => source.loans.setPaymentStatus(payment.id, status, toISODate()),
    success: (_, status) => (status === 'paid' ? t.paidToast(payment.installment_number) : t.pendingToast(payment.installment_number)),
  });

  const remaining = payment.amount - payment.paid_amount;

  async function revert() {
    const ok = await confirm({
      title: t.revertTitle(payment.installment_number),
      description: t.revertDescription,
      confirmLabel: t.revertConfirm,
    });
    if (ok) setStatus.mutate('pending');
  }

  async function pay() {
    // Pagar una cuota con anteriores pendientes las salda todas: los pagos se aplican en orden.
    if (amountToPay - remaining > 0.005) {
      const ok = await confirm({
        title: t.payThroughTitle(payment.installment_number),
        description: t.payThroughDescription(fmt.money(amountToPay)),
        confirmLabel: t.registerPayment,
        destructive: false,
      });
      if (!ok) return;
    }
    setStatus.mutate('paid');
  }

  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5', payment.status === 'paid' && 'text-muted-foreground')}>
      <span className="w-7 shrink-0 text-sm tabular text-muted-foreground">{payment.installment_number}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm whitespace-nowrap text-foreground">{fmt.date(payment.due_date)}</span>
        <Money value={payment.amount} className="block text-xs sm:hidden" />
        {partial && (
          <span className="block text-xs text-loan">
            {t.partialPaid} <Money value={payment.paid_amount} /> {t.of} <Money value={payment.amount} />
          </span>
        )}
      </span>
      <Money value={payment.amount} className="hidden text-sm font-medium text-foreground sm:inline" />
      <span className="flex shrink-0 justify-end sm:w-36">
        {payment.status === 'paid' ? (
          isLastPaid ? (
            <Button variant="ghost" size="sm" onClick={revert} disabled={setStatus.isPending} title={t.revertTooltip} className="text-inflow">
              {setStatus.isPending ? <Loader2 className="animate-spin" /> : <Check />}
              {payment.is_advance ? t.advance : t.paid}
            </Button>
          ) : (
            <Badge variant="outline" className="gap-1 border-transparent text-inflow"><Check className="size-3" />{payment.is_advance ? t.advance : t.paid}</Badge>
          )
        ) : canPay ? (
          <Button variant="outline" size="sm" onClick={pay} disabled={setStatus.isPending}>
            {setStatus.isPending && <Loader2 className="animate-spin" />} {partial ? t.payRest : t.markPaid}
          </Button>
        ) : partial ? (
          <Badge variant="outline" className="text-loan">{t.partial}</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">{t.pending}</Badge>
        )}
      </span>
    </li>
  );
}
