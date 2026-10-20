import { CreditCard } from 'lucide-react';
import { Money } from '@/components/shared/money';
import { useDashboardSummary } from '@/data/queries';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { isCreditCard } from '@/features/accounts/account-label';
import { WidgetBody, WidgetCard } from './widget-card';

/** Referencia del mes anterior completo (no un %: el mes en curso aún no termina). */
function Previous({ value }: { value: number }) {
  const t = useT();
  return (
    <span className="text-xs text-muted-foreground">
      {t.dashboard.month.previous} <Money value={value} />
    </span>
  );
}

/** Entradas, salidas y neto del mes calendario comparados con el anterior. */
export function MonthWidget() {
  const fmt = useFormat();
  const { dashboard: t, common } = useT();
  const summary = useDashboardSummary();
  return (
    <WidgetCard title={t.month.title(fmt.date(new Date(), 'LLLL'))} to="/analisis" linkLabel={t.month.link}>
      <WidgetBody query={summary}>
        {() => {
          const d = summary.data!;
          return (
            <dl className="grid gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">{common.money.income}</dt>
                <dd><Money value={d.monthly_income} className="text-xl font-semibold" /></dd>
                <dd><Previous value={d.previous_month.income} /></dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{common.money.expense}</dt>
                <dd><Money value={d.monthly_expense} className="text-xl font-semibold" /></dd>
                <dd><Previous value={d.previous_month.expense} /></dd>
              </div>
              <div className="border-t pt-3">
                <dt className="text-sm text-muted-foreground">{common.money.net}</dt>
                <dd><Money value={d.monthly_net} signed tone="auto" className="text-xl font-semibold" /></dd>
                <dd><Previous value={d.previous_month.net} /></dd>
              </div>
            </dl>
          );
        }}
      </WidgetBody>
    </WidgetCard>
  );
}

/** Saldo en cuentas, deuda de tarjetas y cada cuenta. */
export function BalancesWidget() {
  const summary = useDashboardSummary();
  const t = useT().dashboard;
  return (
    <WidgetCard title={t.widgets.balances.title} to="/cuentas" linkLabel={t.balances.link}>
      <WidgetBody query={summary}>
        {() => {
          const d = summary.data!;
          return (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t.balances.available}</p>
                  <Money value={d.total_balance} className="text-2xl font-semibold" />
                </div>
                {d.credit_card_debt > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t.balances.owe} <Money value={d.credit_card_debt} className="font-medium text-foreground" /> {t.balances.onCards}
                  </p>
                )}
              </div>
              <ul className="grid gap-2 border-t pt-3">
                {d.accounts.map((account) => {
                  const card = isCreditCard(account);
                  return (
                    <li key={account.id} className="flex items-center gap-2 text-sm">
                      {card && <CreditCard className="size-3.5 text-card-debt" aria-label={t.balances.cardAria} />}
                      <span className="min-w-0 flex-1 truncate">{account.name}</span>
                      <Money value={card ? -Math.max(-account.balance, 0) : account.balance} tone={account.balance < 0 ? 'muted' : 'neutral'} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }}
      </WidgetBody>
    </WidgetCard>
  );
}
