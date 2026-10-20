import { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput, Field, SelectInput } from '@/components/shared/form';
import { Money } from '@/components/shared/money';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useSurcharges } from '@/data/queries';
import type { MonthKey, RecurringService, Surcharge, SurchargeInput, SurchargeType } from '@/data/types';
import { monthKeyToDate } from '@/lib/dates';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';
import { surchargeLabel, surchargeOptions } from './labels';

/** Nota del recargo y si aplica a todos los meses (sin periodo). */
function surchargeDetail(t: Dictionary, row: Surcharge) {
  return [row.note, row.period ? null : t.services.surcharges.allMonths].filter(Boolean).join(', ');
}

interface SurchargesDialogProps {
  service: RecurringService | null;
  month: MonthKey;
  onOpenChange(open: boolean): void;
}

/** Recargos del mes de un servicio (mora, exceso de uso, IVA…): se suman al monto base. */
export function SurchargesDialog({ service, month, onOpenChange }: SurchargesDialogProps) {
  const fmt = useFormat();
  const dictionary = useT();
  const t = dictionary.services.surcharges;
  return (
    <ResponsiveDialog
      open={service !== null}
      onOpenChange={onOpenChange}
      title={service ? t.title(service.name) : t.fallbackTitle}
      description={t.description(fmt.monthYear(monthKeyToDate(month)))}
      footer={<Button variant="outline" onClick={() => onOpenChange(false)}>{dictionary.common.actions.done}</Button>}
    >
      {service && <SurchargesBody service={service} month={month} />}
    </ResponsiveDialog>
  );
}

function SurchargesBody({ service, month }: { service: RecurringService; month: MonthKey }) {
  const source = useDataSource();
  const dictionary = useT();
  const t = dictionary.services.surcharges;
  const options = useMemo(() => surchargeOptions(dictionary), [dictionary]);
  const surcharges = useSurcharges(service.id, month);
  const [type, setType] = useState<SurchargeType>('exceso');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const add = useAppMutation({
    mutationFn: (input: SurchargeInput) => source.services.addSurcharge(service.id, input),
    success: t.added,
    onSuccess: () => {
      setAmount('');
      setNote('');
    },
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.services.removeSurcharge(id),
    success: t.removed,
  });

  const value = Number(amount);
  const canAdd = Number.isFinite(value) && value > 0;

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (canAdd) add.mutate({ type, amount: value, note: note.trim() || null, period: month });
  }

  const data = surcharges.data;

  return (
    <div className="grid gap-5 py-1">
      <div className="rounded-md border text-sm">
        <div className="flex justify-between px-3 py-2">
          <span className="text-muted-foreground">{t.baseAmount}</span>
          <Money value={data?.base_amount ?? service.amount} />
        </div>
        {surcharges.isPending ? (
          <p className="border-t px-3 py-2 text-muted-foreground">{dictionary.common.states.loading}…</p>
        ) : (
          <ul>
            {data?.data.map((row) => (
              <li key={row.id} className="flex items-center gap-2 border-t px-3 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block">{surchargeLabel(dictionary, row.type)}</span>
                  {surchargeDetail(dictionary, row) && (
                    <span className="block truncate text-xs text-muted-foreground">{surchargeDetail(dictionary, row)}</span>
                  )}
                </span>
                <Money value={row.amount} signed tone="outflow" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.remove(surchargeLabel(dictionary, row.type))}
                  onClick={() => remove.mutate(row.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between border-t bg-muted/40 px-3 py-2 font-semibold">
          <span>{t.monthTotal}</span>
          <Money value={data?.total ?? service.amount} />
        </div>
      </div>

      <form onSubmit={handleAdd} className="grid gap-3" noValidate>
        <p className="text-sm font-medium">{t.addTitle}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.type}>
            {(id) => <SelectInput<SurchargeType> id={id} value={type} onChange={setType} options={options} />}
          </Field>
          <Field label={dictionary.common.form.amount}>
            {(id) => <AmountInput id={id} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </Field>
        </div>
        <Field label={t.note} hint={dictionary.common.form.optional}>
          {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} maxLength={200} />}
        </Field>
        <Button type="submit" variant="secondary" disabled={!canAdd || add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />} {t.add}
        </Button>
      </form>
    </div>
  );
}
