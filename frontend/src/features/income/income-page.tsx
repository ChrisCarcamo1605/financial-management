import { useState } from 'react';
import { HandCoins, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuickActions } from '@/app/quick-actions';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useIncomeSources } from '@/data/queries';
import type { IncomeSource } from '@/data/types';
import { useT } from '@/features/preferences/preferences-provider';
import { IncomeForm } from './income-form';
import { scheduleLabel } from './labels';

export default function IncomePage() {
  const t = useT().income;
  const sources = useIncomeSources();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);

  const openForm = (income: IncomeSource | null) => {
    setEditing(income);
    setFormOpen(true);
  };

  const list = sources.data ?? [];
  const netMonthly = list.reduce((sum, s) => sum + s.net_amount, 0);
  const grossMonthly = list.reduce((sum, s) => sum + s.gross_amount, 0);

  return (
    <Page>
      <PageHeader
        title={t.page.title}
        description={t.page.description}
        actions={<Button onClick={() => openForm(null)}><Plus /> {t.page.newIncome}</Button>}
      />

      {sources.isPending ? <ListSkeleton rows={3} /> : sources.isError ? (
        <ErrorState error={sources.error} onRetry={() => sources.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={t.page.emptyTitle}
          description={t.page.emptyDescription}
          action={<Button onClick={() => openForm(null)}><Plus /> {t.page.newIncome}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 md:p-5">
            <Stat label={t.stats.netMonthly} value={<Money value={netMonthly} tone="inflow" />} />
            <Stat label={t.stats.perQuincena} value={<Money value={netMonthly / 2} />} hint={t.stats.average} />
            <Stat className="col-span-2 md:col-span-1" label={t.stats.deductionsMonthly} value={<Money value={grossMonthly - netMonthly} />} hint={<>{t.stats.fromGross} <Money value={grossMonthly} /> {t.stats.gross}</>} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((income) => <IncomeCard key={income.id} income={income} onEdit={() => openForm(income)} />)}
          </div>
        </>
      )}

      <IncomeForm open={formOpen} onOpenChange={setFormOpen} source={editing} />
    </Page>
  );
}

function IncomeCard({ income, onEdit }: { income: IncomeSource; onEdit(): void }) {
  const actions = useQuickActions();
  const dictionary = useT();
  const t = dictionary.income;
  const deductions = [
    { label: 'ISSS', value: income.isss },
    { label: 'AFP', value: income.afp },
    { label: t.card.tax, value: income.isr },
  ];
  const destination = [income.account_name, income.category_name].filter(Boolean).join(', ');
  return (
    <article className="grid gap-4 rounded-lg border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{income.name}</h3>
          <p className="text-sm text-muted-foreground">{t.modality[income.modality]}, {scheduleLabel(dictionary, income).toLowerCase()}</p>
        </div>
        <div className="shrink-0 text-right">
          <Money value={income.net_amount} tone="inflow" className="block text-xl font-semibold" />
          <span className="text-xs text-muted-foreground">{t.card.netPerMonth}</span>
        </div>
      </header>
      <dl className="grid grid-cols-4 gap-2 border-t pt-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">{t.card.gross}</dt>
          <dd><Money value={income.gross_amount} /></dd>
        </div>
        {deductions.map((d) => (
          <div key={d.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{d.label}</dt>
            <dd><Money value={d.value} tone={d.value > 0 ? 'neutral' : 'muted'} /></dd>
          </div>
        ))}
      </dl>
      <footer className="flex flex-wrap items-center gap-2 border-t pt-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {destination ? t.card.recordedIn(destination) : t.card.noDestination}
        </p>
        <Button variant="ghost" size="sm" onClick={onEdit}>{dictionary.common.actions.edit}</Button>
        <Button size="sm" onClick={() => actions.newIncomeFrom(income.id)}>
          <Plus /> {t.card.registerPayment} <Money value={income.net_per_payment} />
        </Button>
      </footer>
    </article>
  );
}
