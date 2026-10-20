import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CreditCard, Loader2, Plus, Receipt, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Panel, Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts, useServices } from '@/data/queries';
import type { MonthKey, RecurringService } from '@/data/types';
import { monthKeyToDate, shiftMonth, toMonthKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { isCreditCard } from '@/features/accounts/account-label';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { ServiceForm } from './service-form';
import { SurchargesDialog } from './surcharges-dialog';

export default function ServicesPage() {
  const fmt = useFormat();
  const t = useT().services;
  const [month, setMonth] = useState<MonthKey>(() => toMonthKey());
  const services = useServices(month);
  const accounts = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringService | null>(null);
  const [surchargesFor, setSurchargesFor] = useState<RecurringService | null>(null);

  const openForm = (service: RecurringService | null) => {
    setEditing(service);
    setFormOpen(true);
  };

  const list = services.data ?? [];
  const active = list.filter((s) => s.active);
  const baseTotal = active.reduce((sum, s) => sum + s.amount, 0);
  const monthTotal = active.reduce((sum, s) => sum + s.month_status.total_amount, 0);
  const generated = active.filter((s) => s.month_status.generated).length;
  const cardIds = new Set((accounts.data ?? []).filter(isCreditCard).map((a) => a.id));
  const currentMonth = toMonthKey();

  return (
    <Page>
      <PageHeader
        title={t.page.title}
        description={t.page.description}
        actions={<Button onClick={() => openForm(null)}><Plus /> {t.page.newService}</Button>}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label={t.page.previousMonth}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label={t.page.nextMonth}><ChevronRight /></Button>
          <h2 className="ml-2 font-semibold first-letter:uppercase" aria-live="polite">{fmt.monthYear(monthKeyToDate(month))}</h2>
        </div>
        {month !== currentMonth && <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth)}>{t.page.goToCurrentMonth}</Button>}
      </div>

      {services.isPending ? <ListSkeleton rows={5} /> : services.isError ? (
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t.page.emptyTitle}
          description={t.page.emptyDescription}
          action={<Button onClick={() => openForm(null)}><Plus /> {t.page.newService}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 md:p-5">
            <Stat label={t.stats.baseMonthly} value={<Money value={baseTotal} />} hint={t.stats.activeCount(active.length)} />
            <Stat label={t.stats.monthTotal} value={<Money value={monthTotal} />} hint={monthTotal > baseTotal ? <>{t.stats.includesSurcharges} <Money value={monthTotal - baseTotal} /> {t.stats.inSurcharges}</> : t.stats.noSurcharges} />
            <Stat
              className="col-span-2 md:col-span-1"
              label={t.stats.paymentsRegistered}
              value={t.stats.paidOf(generated, active.length)}
              hint={t.stats.pendingCount(active.length - generated)}
            />
          </div>

          <Panel bodyClassName="p-0 md:p-0">
            <ul className="divide-y">
              {list.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  month={month}
                  onCard={service.account_id != null && cardIds.has(service.account_id)}
                  onEdit={() => openForm(service)}
                  onSurcharges={() => setSurchargesFor(service)}
                />
              ))}
            </ul>
          </Panel>
        </>
      )}

      <ServiceForm open={formOpen} onOpenChange={setFormOpen} service={editing} />
      <SurchargesDialog service={surchargesFor} month={month} onOpenChange={(open) => !open && setSurchargesFor(null)} />
    </Page>
  );
}

interface ServiceRowProps {
  service: RecurringService;
  month: MonthKey;
  onCard: boolean;
  onEdit(): void;
  onSurcharges(): void;
}

function ServiceRow({ service, month, onCard, onEdit, onSurcharges }: ServiceRowProps) {
  const source = useDataSource();
  const t = useT().services.row;
  const status = service.month_status;
  const missing = [!service.category_id && t.missingCategory, !service.account_id && t.missingAccount].filter(Boolean) as string[];

  const generate = useAppMutation({
    mutationFn: () => source.services.generate(service.id, month),
    onSuccess: (result) => {
      if (result.status === 'created') toast.success(t.paymentRegistered(service.name));
      else if (result.status === 'already_generated') toast.info(t.alreadyRegistered(service.name));
      else toast.error(result.reason);
    },
  });

  return (
    <li className={cn('grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:px-5', !service.active && 'opacity-60')}>
      <button type="button" onClick={onEdit} className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={t.edit(service.name)}>
        <IconBadge icon={service.icon} />
      </button>
      <button type="button" onClick={onEdit} className="min-w-0 text-left focus-visible:outline-none">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{service.name}</span>
          {!service.active && <Badge variant="secondary">{t.paused}</Badge>}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground [&>*+*]:border-l [&>*+*]:pl-2">
          <span>{t.day(service.day_of_month)}</span>
          {service.category_name && <span className="truncate">{service.category_name}</span>}
          {service.account_name && (
            <span className="flex items-center gap-1 truncate">
              {onCard && <CreditCard className="size-3.5 text-card-debt" aria-label={t.creditCard} />}
              {service.account_name}
            </span>
          )}
          {missing.length > 0 && <span className="text-destructive">{t.missing(missing)}</span>}
        </span>
      </button>
      <div className="text-right">
        <Money value={status.total_amount} className="font-semibold" />
        {status.surcharge_total > 0 && (
          <p className="text-xs text-muted-foreground">
            <Money value={service.amount} /> + <Money value={status.surcharge_total} />
          </p>
        )}
      </div>

      <div className="col-span-3 flex flex-wrap items-center gap-2 md:col-span-2 md:col-start-2">
        {status.generated ? (
          <Badge variant="outline" className="text-inflow">{t.registered}</Badge>
        ) : (
          <Badge variant="outline" className="text-loan">{t.pending}</Badge>
        )}
        <span className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={onSurcharges}><Zap /> {t.surcharges}</Button>
          {service.active && !status.generated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generate.mutate()}
              disabled={generate.isPending || missing.length > 0}
              title={missing.length > 0 ? t.missing(missing) : undefined}
            >
              {generate.isPending && <Loader2 className="animate-spin" />} {t.registerPayment}
            </Button>
          )}
        </span>
      </div>
    </li>
  );
}
