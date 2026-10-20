import { useState } from 'react';
import { Landmark, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useLoans } from '@/data/queries';
import type { Loan } from '@/data/types';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { AbonoDialog } from './abono-dialog';
import { LoanDetail } from './loan-detail';
import { LoanForm } from './loan-form';
import { loanStatusLabel, nextPendingPayment } from './labels';

export default function LoansPage() {
  const t = useT().loans;
  const loans = useLoans();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [abonoFor, setAbonoFor] = useState<Loan | null>(null);

  const list = loans.data ?? [];
  // El detalle se deriva de la lista para reflejar cada cambio al instante.
  const detail = list.find((l) => l.id === detailId) ?? null;
  const active = list.filter((l) => l.status === 'active');
  const remaining = active.reduce((sum, l) => sum + l.remaining, 0);
  const nextMonthly = active.reduce((sum, l) => sum + (nextPendingPayment(l)?.amount ?? 0), 0);

  const openForm = (loan: Loan | null) => {
    setDetailId(null);
    setEditing(loan);
    setFormOpen(true);
  };

  return (
    <Page>
      <PageHeader
        title={t.page.title}
        description={t.page.description}
        actions={<Button onClick={() => openForm(null)}><Plus /> {t.page.newLoan}</Button>}
      />

      {loans.isPending ? <ListSkeleton rows={3} /> : loans.isError ? (
        <ErrorState error={loans.error} onRetry={() => loans.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={t.page.emptyTitle}
          description={t.page.emptyDescription}
          action={<Button onClick={() => openForm(null)}><Plus /> {t.page.newLoan}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 md:p-5">
            <Stat label={t.stats.remaining} value={<Money value={remaining} />} hint={t.stats.activeCount(active.length)} />
            <Stat label={t.stats.nextInstallments} value={<Money value={nextMonthly} />} hint={t.stats.nextInstallmentsHint} />
            <Stat className="col-span-2 md:col-span-1" label={t.stats.paidOff} value={String(list.length - active.length)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((loan) => (
              <LoanCard key={loan.id} loan={loan} onOpen={() => setDetailId(loan.id)} onAbonar={() => setAbonoFor(loan)} />
            ))}
          </div>
        </>
      )}

      <LoanForm open={formOpen} onOpenChange={setFormOpen} loan={editing} />
      <LoanDetail
        loan={detail}
        onOpenChange={(open) => !open && setDetailId(null)}
        onEdit={openForm}
        onAbonar={(loan) => {
          setDetailId(null);
          setAbonoFor(loan);
        }}
      />
      <AbonoDialog loan={abonoFor} onOpenChange={(open) => !open && setAbonoFor(null)} />
    </Page>
  );
}

function LoanCard({ loan, onOpen, onAbonar }: { loan: Loan; onOpen(): void; onAbonar(): void }) {
  const fmt = useFormat();
  const dictionary = useT();
  const t = dictionary.loans;
  const progress = loan.total_amount > 0 ? (loan.total_paid / loan.total_amount) * 100 : 0;
  const next = nextPendingPayment(loan);
  const paid = loan.status === 'paid';

  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <header className="flex items-start gap-3">
        <IconBadge icon={loan.category_icon ?? 'bank'} color={loan.category_color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{loan.name}</h3>
          <p className="text-sm text-muted-foreground">
            {t.card.annualRate(t.methods[loan.interest_method], loan.interest_rate)}
          </p>
        </div>
        <Badge variant="outline" className={cn(paid ? 'text-inflow' : 'text-muted-foreground')}>{loanStatusLabel(dictionary, loan)}</Badge>
      </header>
      <div>
        <p className="flex items-baseline gap-1.5">
          <Money value={loan.remaining} className="text-2xl font-semibold" />
          <span className="text-sm text-muted-foreground">{t.card.of} <Money value={loan.total_amount} /></span>
        </p>
        <Progress value={progress} className="mt-3 h-1.5 [&>[data-slot=progress-indicator]]:bg-viz-loan" aria-label={t.card.paidPercent(Math.round(progress))} />
      </div>
      <p className="text-sm">
        {next ? (
          <>
            <span className="text-muted-foreground">{t.card.nextInstallment} </span>
            {fmt.dayMonth(next.due_date)}{' '}
            <Money value={next.amount - next.paid_amount} className="font-medium" />
          </>
        ) : <span className="text-muted-foreground">{t.card.noPending}</span>}
      </p>
      <div className="mt-auto flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onOpen}>{t.card.viewSchedule}</Button>
        {!paid && <Button variant="secondary" className="flex-1" onClick={onAbonar}>{t.card.extraPayment}</Button>}
      </div>
    </article>
  );
}
