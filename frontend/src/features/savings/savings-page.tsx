import { useMemo, useState } from 'react';
import { Check, Loader2, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Panel, Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useSavingsGoals } from '@/data/queries';
import type { GenerateResult, SavingsContribution, SavingsGoal } from '@/data/types';
import { savingsQuincenaOf, toMonthKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { ContributeForm } from './contribute-form';
import { GoalForm } from './goal-form';

const HISTORY_LIMIT = 15;
const DEFAULT_COLOR = 'var(--viz-saving)';

export default function SavingsPage() {
  const goals = useSavingsGoals();
  const t = useT().savings;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);

  const openForm = (goal: SavingsGoal | null) => {
    setEditing(goal);
    setFormOpen(true);
  };
  const openContribute = (goal: SavingsGoal) => {
    setContributing(goal);
    setContributeOpen(true);
  };

  const list = goals.data ?? [];
  const saved = list.reduce((sum, g) => sum + g.current_amount, 0);
  const target = list.reduce((sum, g) => sum + g.target_amount, 0);
  const monthlyPlan = list.filter((g) => g.active).reduce((sum, g) => sum + g.per_quincena, 0);

  return (
    <Page>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<Button onClick={() => openForm(null)}><Plus /> {t.new}</Button>}
      />

      {goals.isPending ? <ListSkeleton rows={3} /> : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => goals.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={t.empty.title}
          description={t.empty.description}
          action={<Button onClick={() => openForm(null)}><Plus /> {t.new}</Button>}
        />
      ) : (
        <>
          <SavingsSummary saved={saved} target={target} monthlyPlan={monthlyPlan} />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={t.listLabel}>
            {list.map((goal) => (
              <li key={goal.id} className="min-w-0">
                <GoalCard goal={goal} onEdit={() => openForm(goal)} onContribute={() => openContribute(goal)} />
              </li>
            ))}
          </ul>
          <ContributionHistory goals={list} />
        </>
      )}

      <GoalForm open={formOpen} onOpenChange={setFormOpen} goal={editing} />
      <ContributeForm open={contributeOpen} onOpenChange={setContributeOpen} goal={contributing} />
    </Page>
  );
}

function SavingsSummary({ saved, target, monthlyPlan }: { saved: number; target: number; monthlyPlan: number }) {
  const fmt = useFormat();
  const t = useT().savings;
  const pct = target > 0 ? (saved / target) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 md:p-5">
      <Stat label={t.stats.saved} value={<Money value={saved} />} />
      <Stat label={t.stats.ofGoals} value={fmt.percent(pct)} hint={<>{t.stats.totalTarget} <Money value={target} /></>} />
      <Stat className="col-span-2 md:col-span-1" label={t.stats.monthlyPlan} value={<Money value={monthlyPlan} />} />
    </div>
  );
}

function GoalCard({ goal, onEdit, onContribute }: { goal: SavingsGoal; onEdit(): void; onContribute(): void }) {
  const fmt = useFormat();
  const t = useT().savings;
  const color = goal.color || DEFAULT_COLOR;
  const pct = Math.min(goal.percentage, 100);
  const q1 = goal.per_quincena_q1 ?? goal.per_quincena / 2;
  const q2 = goal.per_quincena_q2 ?? goal.per_quincena / 2;

  return (
    <article className={cn('flex h-full flex-col gap-4 rounded-lg border bg-card p-4', !goal.active && 'opacity-70')}>
      <header className="flex items-start gap-3">
        <IconBadge icon={goal.icon} color={goal.color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{goal.name}</h3>
          <p className="text-xs text-muted-foreground">
            {goal.active ? (goal.account_name ? t.card.from(goal.account_name) : t.card.manualOnly) : t.card.paused}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2" onClick={onEdit} aria-label={t.card.edit(goal.name)}>
          <Pencil />
        </Button>
      </header>

      <div>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <Money value={goal.current_amount} className="text-2xl font-semibold" />
          <span className="text-sm text-muted-foreground">{t.card.of} <Money value={goal.target_amount} /></span>
        </p>
        <div
          className="mt-2.5 h-2 overflow-hidden rounded-full bg-viz-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={t.card.progress(goal.name, Math.round(goal.percentage))}
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <p className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
          <span>{goal.remaining > 0 ? <>{t.card.remaining} <Money value={goal.remaining} /></> : t.card.reached}</span>
          <span className="tabular">{fmt.percent(goal.percentage)}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-md bg-muted/60 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t.card.firstHalf}{goal.day_q1 ? t.card.day(goal.day_q1) : ''}</dt>
          <dd className="font-medium"><Money value={q1} /></dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t.card.secondHalf}{goal.day_q2 ? t.card.day(goal.day_q2) : ''}</dt>
          <dd className="font-medium"><Money value={q2} /></dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        {goal.active && <GenerateButton goal={goal} />}
        <Button variant="outline" size="sm" onClick={onContribute}><Plus /> {t.card.contribute}</Button>
      </div>
    </article>
  );
}

/** Genera el aporte automático de la quincena actual (gasto en la cuenta + aporte a la meta). */
function GenerateButton({ goal }: { goal: SavingsGoal }) {
  const fmt = useFormat();
  const t = useT().savings.generate;
  const source = useDataSource();
  const month = toMonthKey();
  const quincena = savingsQuincenaOf();
  const period = `${month}-Q${quincena}`;
  const done = goal.contributions.some((c) => c.quincena_period === period);
  const amount = quincena === 1 ? (goal.per_quincena_q1 ?? goal.per_quincena / 2) : (goal.per_quincena_q2 ?? goal.per_quincena / 2);

  const generate = useAppMutation<void, GenerateResult>({
    mutationFn: () => source.savings.generate(goal.id, month, quincena),
    onSuccess: (result) => {
      if (result.status === 'created') toast.success(t.created(fmt.money(result.amount), goal.name));
      else if (result.status === 'already_generated') toast.info(t.already(quincena));
      else toast.error(result.reason);
    },
  });

  if (done) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground">
        <Check className="size-4 text-inflow" aria-hidden /> {t.done(quincena)}
      </span>
    );
  }
  if (!goal.account_id || amount <= 0) return null;

  return (
    <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
      {generate.isPending ? <Loader2 className="animate-spin" /> : <PiggyBank />}
      {t.action(quincena)}
    </Button>
  );
}

interface HistoryItem extends SavingsContribution {
  color: string | null;
}

function ContributionHistory({ goals }: { goals: SavingsGoal[] }) {
  const t = useT().savings;
  const items = useMemo<HistoryItem[]>(() => goals
    .flatMap((goal) => goal.contributions.map((c) => ({ ...c, goal_name: c.goal_name ?? goal.name, color: goal.color })))
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1))
    .slice(0, HISTORY_LIMIT), [goals]);

  if (items.length === 0) return null;

  return (
    <Panel title={t.history.title} bodyClassName="p-0 md:p-0">
      <ul className="mt-2 divide-y border-t">
        {items.map((item) => <ContributionRow key={item.id} item={item} />)}
      </ul>
    </Panel>
  );
}

function ContributionRow({ item }: { item: HistoryItem }) {
  const fmt = useFormat();
  const t = useT().savings.history;
  const source = useDataSource();
  const confirm = useConfirm();
  const remove = useAppMutation({
    mutationFn: () => source.savings.removeContribution(item.id),
    success: t.deleted,
  });

  async function handleDelete() {
    const ok = await confirm({
      title: t.deleteTitle,
      description: t.deleteDescription(item.goal_name ?? ''),
    });
    if (ok) remove.mutate();
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 md:px-5">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color || DEFAULT_COLOR }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.goal_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {fmt.date(item.date)}, {t.sources[item.source ?? 'manual'] ?? item.source}
        </p>
      </div>
      <Money value={item.amount} signed tone="inflow" className="text-sm font-medium" />
      <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={remove.isPending} aria-label={t.deleteLabel(item.goal_name ?? '')}>
        <Trash2 />
      </Button>
    </li>
  );
}
