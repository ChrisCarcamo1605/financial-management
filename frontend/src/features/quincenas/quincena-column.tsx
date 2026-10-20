import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import type { CardReserve, GenerateResult, MonthKey, Quincena } from '@/data/types';
import { useQuickActions } from '@/app/quick-actions';
import { toISODate, type QuincenaNumber } from '@/lib/dates';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { TransactionRow } from '@/features/transactions/transaction-row';
import { ChargeList } from './charge-list';
import { CommitmentRow } from './commitment-row';
import { FlowBar } from './flow-bar';
import { paidServiceIds, quincenaBreakdown, type SavingsRow } from './quincena-math';

export type QuincenaMode = 'plan' | 'real';

interface QuincenaColumnProps {
  quincena: Quincena;
  number: QuincenaNumber;
  month: MonthKey;
  savings: SavingsRow[];
  mode: QuincenaMode;
  isCurrent: boolean;
}

function Group({ title, total, children }: { title: string; total?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <header className="flex items-center justify-between bg-muted/60 px-4 py-1.5 text-xs md:px-5">
        <h4 className="font-medium">{title}</h4>
        {total}
      </header>
      <ul className="divide-y">{children}</ul>
    </section>
  );
}

/** Falta configuración (cuenta, categoría o monto) → error visible en vez de éxito. */
async function ensureGenerated(promise: Promise<GenerateResult>) {
  const result = await promise;
  if (result.status === 'missing_config') throw new Error(result.reason);
  return result;
}

function generatedMessage(result: GenerateResult, created: string, existing: string) {
  return result.status === 'created' ? created : existing;
}

export function QuincenaColumn({ quincena, number, month, savings, mode, isCurrent }: QuincenaColumnProps) {
  const fmt = useFormat();
  const { quincenas: t, common } = useT();
  const breakdown = quincenaBreakdown(quincena, savings);

  return (
    <article className={`flex min-w-0 flex-col overflow-clip rounded-lg border bg-card ${isCurrent ? 'border-primary/60 ring-1 ring-primary/30' : ''}`}>
      <header className="grid gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">{number === 1 ? common.quincena.first : common.quincena.second}</h3>
            <p className="text-sm text-muted-foreground">{common.dates.range(fmt.dayMonth(quincena.start), fmt.dayMonth(quincena.end))}</p>
          </div>
          {isCurrent && <Badge>{t.current}</Badge>}
        </div>
        {mode === 'plan' ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{breakdown.free >= 0 ? common.money.free : common.money.shortfall}</p>
                <Money value={breakdown.free} tone={breakdown.free < 0 ? 'outflow' : 'neutral'} className="text-2xl font-semibold" />
              </div>
              <p className="text-right text-sm text-muted-foreground">
                {t.column.comesIn} <Money value={breakdown.income} className="text-foreground" /><br />
                {t.column.committed} <Money value={breakdown.committed} className="text-foreground" />
              </p>
            </div>
            <FlowBar breakdown={breakdown} />
          </>
        ) : (
          <RealSummary quincena={quincena} />
        )}
      </header>
      <div className="border-t">
        {mode === 'plan'
          ? <PlanDetails quincena={quincena} number={number} month={month} savings={savings} />
          : <RealDetails quincena={quincena} />}
      </div>
    </article>
  );
}

function RealSummary({ quincena }: { quincena: Quincena }) {
  const { quincenas: t, common } = useT();
  const income = quincena.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = quincena.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return (
    <dl className="grid grid-cols-3 gap-3">
      <div><dt className="text-sm text-muted-foreground">{t.column.in}</dt><dd><Money value={income} tone="inflow" className="font-semibold" /></dd></div>
      <div><dt className="text-sm text-muted-foreground">{t.column.out}</dt><dd><Money value={expense} className="font-semibold" /></dd></div>
      <div><dt className="text-sm text-muted-foreground">{common.money.net}</dt><dd><Money value={income - expense} signed className="font-semibold" /></dd></div>
    </dl>
  );
}

function RealDetails({ quincena }: { quincena: Quincena }) {
  const actions = useQuickActions();
  const fmt = useFormat();
  const t = useT().quincenas;
  if (quincena.transactions.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{t.column.noTransactions}</p>;
  }
  const sorted = [...quincena.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return (
    <ul className="divide-y">
      {sorted.map((tx) => (
        <li key={tx.id}>
          <TransactionRow transaction={tx} onSelect={actions.editTransaction} meta={`${fmt.dayMonth(tx.date)}, ${tx.category_name ?? ''}`} />
        </li>
      ))}
    </ul>
  );
}

/** Reserva para la tarjeta: el usuario confirma si de verdad apartó el dinero. */
function ReserveRow({ reserve }: { reserve: CardReserve }) {
  const fmt = useFormat();
  const source = useDataSource();
  const t = useT().quincenas.card;
  const setSaved = useAppMutation({
    mutationFn: (saved: boolean) => source.quincenas.setCardReserve({
      card_id: reserve.card_id,
      payment_due_date: reserve.payment_due_date,
      period: reserve.period,
      saved,
    }),
    success: (_, saved) => (saved ? t.markedSaved : t.markedNotSaved),
  });

  const missed = reserve.status === 'missed';
  const details = [
    reserve.carried_in > 0 ? t.reserveCarried(fmt.money(reserve.carried_in)) : t.reserveOwn,
    missed ? t.reserveMissed : t.reservePaidOn(fmt.dayMonth(reserve.payment_due_date)),
  ];

  return (
    <CommitmentRow
      icon="savings"
      tone="card"
      title={t.reserveTitle(reserve.card_name)}
      amount={reserve.need}
      muted={missed}
      subtitle={details.join('; ')}
      status={{ done: reserve.status === 'saved', label: t.status[reserve.status] }}
      details={<ChargeList charges={reserve.charges} />}
      action={reserve.status === 'saved' ? (
        <Button size="xs" variant="ghost" disabled={setSaved.isPending} onClick={() => setSaved.mutate(false)}>
          {t.notSaved}
        </Button>
      ) : (
        <Button size="xs" variant="outline" disabled={setSaved.isPending} onClick={() => setSaved.mutate(true)}>
          {missed ? t.savedItLate : t.savedIt}
        </Button>
      )}
    />
  );
}

function PlanDetails({ quincena, number, month, savings }: { quincena: Quincena; number: QuincenaNumber; month: MonthKey; savings: SavingsRow[] }) {
  const fmt = useFormat();
  const source = useDataSource();
  const t = useT().quincenas;
  const paidServices = paidServiceIds(quincena);

  const payService = useAppMutation({
    mutationFn: ({ id, chargeDate }: { id: number; chargeDate: string }) => ensureGenerated(source.services.generate(id, chargeDate.slice(0, 7))),
    success: (result) => generatedMessage(result, t.generated.payment, t.generated.paymentExisting),
  });
  const payInstallment = useAppMutation({
    mutationFn: (paymentId: number) => source.loans.setPaymentStatus(paymentId, 'paid', toISODate()),
    success: t.loan.marked,
  });
  const contribute = useAppMutation({
    mutationFn: (goalId: number) => ensureGenerated(source.savings.generate(goalId, month, number)),
    success: (result) => generatedMessage(result, t.generated.contribution, t.generated.contributionExisting),
  });

  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const isEmpty = !quincena.income_sources.length && !quincena.services.length && !quincena.payments.length
    && !quincena.credit_cards.length && !quincena.card_reserves.length && !savings.length;

  if (isEmpty) return <p className="p-6 text-center text-sm text-muted-foreground">{t.column.nothingPlanned}</p>;

  return (
    <>
      {quincena.income_sources.length > 0 && (
        <Group title={t.groups.income} total={<Money value={quincena.income} className="text-muted-foreground" />}>
          {quincena.income_sources.map((src) => (
            <CommitmentRow
              key={src.id}
              icon="work"
              tone="inflow"
              positive
              title={src.name}
              amount={src.net_amount}
              subtitle={src.isss + src.afp + src.isr > 0
                ? t.incomeDetail(t.modality[src.modality], fmt.money(src.gross_amount), fmt.money(src.isss + src.afp + src.isr))
                : t.modality[src.modality]}
            />
          ))}
        </Group>
      )}

      {quincena.services.length > 0 && (
        <Group title={t.groups.services} total={<Money value={sum(quincena.services.filter((s) => !s.deferred).map((s) => s.amount))} className="text-muted-foreground" />}>
          {quincena.services.map((service) => {
            const paid = paidServices.has(service.id);
            return (
              <CommitmentRow
                key={service.id}
                icon={service.icon}
                tone={service.deferred ? 'card' : 'outflow'}
                title={service.name}
                amount={service.amount}
                muted={service.deferred}
                subtitle={service.deferred
                  ? t.service.onCard(service.day, service.card_name ?? '', service.card_payment_quincena ?? 1, fmt.monthShort(`${service.card_payment_month}-01`))
                  : t.service.cash(service.day, service.account_name)}
                status={{ done: paid, label: paid ? (service.deferred ? t.service.charged : t.service.paid) : t.service.pending }}
                action={!paid && (
                  <Button size="xs" variant="outline" disabled={payService.isPending} onClick={() => payService.mutate({ id: service.id, chargeDate: service.charge_date })}>
                    {service.deferred ? t.service.registerCharge : t.service.registerPayment}
                  </Button>
                )}
              />
            );
          })}
        </Group>
      )}

      {quincena.payments.length > 0 && (
        <Group title={t.groups.loans} total={<Money value={sum(quincena.payments.map((p) => p.amount))} className="text-muted-foreground" />}>
          {quincena.payments.map((payment) => {
            const partial = payment.status === 'pending' && payment.paid_amount > 0;
            return (
              <CommitmentRow
                key={payment.id}
                icon="bank"
                tone="loan"
                title={t.loan.title(payment.loan_name ?? t.loan.fallbackName, payment.installment_number)}
                amount={payment.amount}
                subtitle={partial ? t.loan.duePartial(fmt.dayMonth(payment.due_date), fmt.money(payment.paid_amount)) : t.loan.due(fmt.dayMonth(payment.due_date))}
                status={{ done: payment.status === 'paid', label: payment.status === 'paid' ? (payment.is_advance ? t.loan.advance : t.loan.paid) : t.service.pending }}
                action={payment.status === 'pending' && (
                  <Button size="xs" variant="outline" disabled={payInstallment.isPending} onClick={() => payInstallment.mutate(payment.id)}>
                    {t.loan.markPaid}
                  </Button>
                )}
              />
            );
          })}
        </Group>
      )}

      {(quincena.credit_cards.length > 0 || quincena.card_reserves.length > 0) && (
        <Group title={t.groups.cards} total={<Money value={sum([...quincena.credit_cards.map((c) => c.cash_needed), ...quincena.card_reserves.map((r) => r.amount)])} className="text-muted-foreground" />}>
          {quincena.credit_cards.map((card) => (
            <CommitmentRow
              key={`pay-${card.id}-${card.payment_due_date}`}
              icon="card"
              tone="card"
              title={t.card.payTitle(card.name)}
              amount={card.cash_needed}
              subtitle={[
                card.reserved_prior > 0
                  ? t.card.savedBefore(fmt.money(card.amount), fmt.money(card.reserved_prior))
                  : t.card.cutoff(fmt.dayMonth(card.cutoff_date)),
                card.carried_in > 0 ? t.card.carried(fmt.money(card.carried_in)) : null,
                t.card.due(fmt.dayMonth(card.payment_due_date)),
              ].filter(Boolean).join('; ')}
              status={card.cash_needed <= 0.005 ? { done: true, label: t.card.covered } : undefined}
              details={<ChargeList charges={card.charges} />}
            />
          ))}
          {quincena.card_reserves.map((reserve) => (
            <ReserveRow key={`res-${reserve.card_id}-${reserve.payment_due_date}`} reserve={reserve} />
          ))}
        </Group>
      )}

      {savings.length > 0 && (
        <Group title={t.groups.savings} total={<Money value={sum(savings.map((s) => s.amount))} className="text-muted-foreground" />}>
          {savings.map((row) => (
            <CommitmentRow
              key={row.id}
              icon={row.icon}
              tone="saving"
              title={row.name}
              amount={row.amount}
              status={{ done: row.paid, label: row.paid ? t.saving.contributed : t.service.pending }}
              action={!row.paid && (
                <Button size="xs" variant="outline" disabled={contribute.isPending} onClick={() => contribute.mutate(row.id)}>
                  {t.saving.register}
                </Button>
              )}
            />
          ))}
        </Group>
      )}
    </>
  );
}
