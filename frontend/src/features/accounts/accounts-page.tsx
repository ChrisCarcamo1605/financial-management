import { useState } from 'react';
import { ArrowLeftRight, CreditCard, Plus, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Panel, Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts, useTransfers } from '@/data/queries';
import type { Account, Transfer } from '@/data/types';
import { useQuickActions } from '@/app/quick-actions';
import { nextDayOfMonth } from '@/lib/dates';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { AccountForm } from './account-form';
import { isCreditCard } from './account-label';

export default function AccountsPage() {
  const accounts = useAccounts();
  const actions = useQuickActions();
  const { accounts: t, common } = useT();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const openForm = (account: Account | null) => {
    setEditing(account);
    setFormOpen(true);
  };

  const list = accounts.data ?? [];
  const cash = list.filter((a) => !isCreditCard(a));
  const cards = list.filter(isCreditCard);
  const cashTotal = cash.reduce((sum, a) => sum + a.balance, 0);
  const debt = cards.reduce((sum, a) => sum + Math.max(-a.balance, 0), 0);

  return (
    <Page>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={(
          <>
            <Button variant="outline" onClick={() => actions.newTransfer()} disabled={list.length < 2}>
              <ArrowLeftRight /> {common.actions.transfer}
            </Button>
            <Button onClick={() => openForm(null)}><Plus /> {t.newAccount}</Button>
          </>
        )}
      />

      {accounts.isPending ? <ListSkeleton rows={4} /> : accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t.empty.title}
          description={t.empty.description}
          action={<Button onClick={() => openForm(null)}><Plus /> {t.newAccount}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 md:p-5">
            <Stat label={t.stats.inAccounts} value={<Money value={cashTotal} />} />
            <Stat label={t.stats.cardDebt} value={<Money value={debt} tone={debt > 0 ? 'outflow' : 'neutral'} />} />
            <Stat className="col-span-2 md:col-span-1" label={t.stats.netWorth} value={<Money value={cashTotal - debt} />} hint={t.stats.netWorthHint} />
          </div>

          <section className="grid gap-3">
            <h2 className="font-semibold">{t.sections.accounts}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cash.map((account) => <CashAccountCard key={account.id} account={account} onEdit={() => openForm(account)} />)}
            </div>
          </section>

          {cards.length > 0 && (
            <section className="grid gap-3">
              <h2 className="font-semibold">{t.sections.cards}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <CreditCardCard
                    key={card.id}
                    card={card}
                    onEdit={() => openForm(card)}
                    onPay={() => actions.newTransfer({ toAccountId: card.id, amount: Math.max(-card.balance, 0) || undefined })}
                  />
                ))}
              </div>
            </section>
          )}

          <RecentTransfers />
        </>
      )}

      <AccountForm open={formOpen} onOpenChange={setFormOpen} account={editing} />
    </Page>
  );
}

function CashAccountCard({ account, onEdit }: { account: Account; onEdit(): void }) {
  const t = useT().accounts;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex flex-col gap-6 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={t.editAria(account.name)}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{account.name}</span>
        <span className="text-xs text-muted-foreground">{account.currency}</span>
      </span>
      <Money value={account.balance} tone={account.balance < 0 ? 'outflow' : 'neutral'} className="text-2xl font-semibold" />
    </button>
  );
}

function CreditCardCard({ card, onEdit, onPay }: { card: Account; onEdit(): void; onPay(): void }) {
  const fmt = useFormat();
  const { accounts: { card: t }, common } = useT();
  const limit = card.credit_limit ?? 0;
  const used = Math.max(-card.balance, 0);
  const usage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const nextCutoff = card.cutoff_day ? nextDayOfMonth(card.cutoff_day) : null;
  const nextDue = card.payment_due_day ? nextDayOfMonth(card.payment_due_day) : null;

  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <CreditCard className="size-4 shrink-0 text-card-debt" aria-hidden />
          <span className="truncate font-medium">{card.name}</span>
        </span>
        <Button variant="ghost" size="sm" className="-mt-1 -mr-2" onClick={onEdit}>{common.actions.edit}</Button>
      </header>
      <div>
        <p className="text-sm text-muted-foreground">{t.used}</p>
        <p className="flex items-baseline gap-1.5">
          <Money value={used} className="text-2xl font-semibold" />
          <span className="text-sm text-muted-foreground">{t.of} <Money value={limit} whole /></span>
        </p>
        <Progress value={usage} className="mt-3 h-1.5 [&>[data-slot=progress-indicator]]:bg-viz-card" aria-label={t.usageAria(Math.round(usage))} />
        <p className="mt-2 text-xs text-muted-foreground">
          {t.available} <Money value={card.available} />
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{t.nextCutoff}</dt>
          <dd>{nextCutoff ? fmt.dayMonth(nextCutoff) : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t.payBefore}</dt>
          <dd>{nextDue ? fmt.dayMonth(nextDue) : '—'}</dd>
        </div>
      </dl>
      <Button variant="outline" onClick={onPay} disabled={used === 0}>
        {used === 0 ? t.nothingDue : t.pay}
      </Button>
    </article>
  );
}

function RecentTransfers() {
  const transfers = useTransfers(10);
  const t = useT().accounts;
  if (!transfers.data?.length) return null;
  return (
    <Panel title={t.sections.transfers} bodyClassName="p-0 md:p-0">
      <ul className="divide-y">
        {transfers.data.map((transfer) => <TransferRow key={transfer.id} transfer={transfer} />)}
      </ul>
    </Panel>
  );
}

function TransferRow({ transfer }: { transfer: Transfer }) {
  const fmt = useFormat();
  const source = useDataSource();
  const confirm = useConfirm();
  const t = useT().accounts.transfer;
  const remove = useAppMutation({
    mutationFn: () => source.transfers.remove(transfer.id),
    success: t.deleted,
  });

  async function handleDelete() {
    const ok = await confirm({
      title: t.deleteTitle,
      description: t.deleteDescription,
    });
    if (ok) remove.mutate();
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 md:px-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ArrowLeftRight className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{transfer.from_account_name} → {transfer.to_account_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {fmt.date(transfer.date)}{transfer.description ? ` · ${transfer.description}` : ''}
        </p>
      </div>
      <Money value={transfer.amount} className="text-sm font-medium" />
      <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={remove.isPending} aria-label={t.deleteAria}>
        <Trash2 />
      </Button>
    </li>
  );
}
