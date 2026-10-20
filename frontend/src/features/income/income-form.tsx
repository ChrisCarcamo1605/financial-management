import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import {
  AmountInput, Field, FieldRow, FormActions, FormStack, Segmented, SelectInput,
} from '@/components/shared/form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAccounts, useCategories } from '@/data/queries';
import { useAppMutation } from '@/data/mutations';
import type { IncomeSource, IncomeSourceInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { DAYS_OF_MONTH } from '@/lib/constants';
import { currencyOptions as buildCurrencyOptions } from '@/features/preferences/defaults';
import { usePreferences } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';
import { DeductionsPreview } from './deductions-preview';
import { modalityOptions, scheduleOptions } from './labels';

const FORM_ID = 'income-form';

function buildSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.common.form.errors.nameRequired).max(100),
    modality: z.enum(['planilla', 'servicios_profesionales', 'pension']),
    gross_amount: z.number({ error: t.income.form.grossRequired }).positive(t.common.form.errors.amountPositive),
    pay_schedule: z.enum(['monthly', 'biweekly']),
    pay_day: z.number().int().min(1).max(31).nullable(),
    currency: z.string().length(3),
    account_id: z.number().nullable(),
    category_id: z.number().nullable(),
  });
}

const NONE = 'ninguna';

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface IncomeFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  source?: IncomeSource | null;
}

export function IncomeForm({ open, onOpenChange, source: income }: IncomeFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const { preferences, t: dictionary } = usePreferences();
  const t = dictionary.income.form;
  const common = dictionary.common;
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const modalities = useMemo(() => modalityOptions(dictionary), [dictionary]);
  const schedules = useMemo(() => scheduleOptions(dictionary), [dictionary]);
  const accounts = useAccounts();
  const incomeCategories = useCategories('income');
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen<FormValues>(open, reset, () => (income
    ? {
        name: income.name,
        modality: income.modality,
        gross_amount: income.gross_amount,
        pay_schedule: income.pay_schedule,
        pay_day: income.pay_day,
        currency: income.currency,
        account_id: income.account_id,
        category_id: income.category_id,
      }
    : {
        name: '',
        modality: 'planilla',
        gross_amount: undefined as unknown as number,
        pay_schedule: 'monthly',
        pay_day: 30,
        currency: preferences.currency,
        account_id: accounts.data?.find((a) => a.type === 'normal')?.id ?? null,
        category_id: incomeCategories.data?.[0]?.id ?? null,
      }));

  const [gross, modality, schedule] = useWatch({ control, name: ['gross_amount', 'modality', 'pay_schedule'] });

  const save = useAppMutation({
    mutationFn: (input: IncomeSourceInput) =>
      income ? source.incomeSources.update(income.id, input) : source.incomeSources.create(input),
    success: income ? t.updated : t.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.incomeSources.remove(id),
    success: t.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({
    ...values,
    pay_day: values.pay_schedule === 'monthly' ? values.pay_day : null,
  }));

  async function handleDelete() {
    if (!income) return;
    const ok = await confirm({
      title: common.confirm.deleteTitle(income.name),
      description: t.deleteDescription,
    });
    if (ok) remove.mutate(income.id);
  }

  const accountOptions = [
    { value: NONE, label: common.form.unassigned },
    ...(accounts.data ?? []).filter((a) => a.type === 'normal').map((a) => ({ value: String(a.id), label: a.name })),
  ];
  const categoryOptions = [
    { value: NONE, label: common.form.unassigned },
    ...(incomeCategories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const currencyOptions = buildCurrencyOptions(dictionary);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={income ? t.editTitle : t.newTitle}
      description={t.description}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={income ? common.actions.saveChanges : t.add}
          pending={save.isPending}
          onCancel={close}
          onDelete={income ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <Field label={common.form.name} error={errors.name?.message}>
            {(id) => <Input id={id} placeholder={t.namePlaceholder} aria-invalid={!!errors.name || undefined} {...register('name')} />}
          </Field>
          <Field label={t.modality}>
            {() => (
              <Controller control={control} name="modality" render={({ field }) => (
                <Segmented label={t.modality} options={modalities} value={field.value ?? 'planilla'} onChange={field.onChange} size="sm" />
              )} />
            )}
          </Field>
          <FieldRow>
            <Field label={t.grossMonthly} error={errors.gross_amount?.message}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.gross_amount || undefined} {...register('gross_amount', { valueAsNumber: true })} />}
            </Field>
            <Field label={common.form.currency}>
              {(id) => (
                <Controller control={control} name="currency" render={({ field }) => (
                  <SelectInput id={id} value={field.value} onChange={field.onChange} options={currencyOptions} />
                )} />
              )}
            </Field>
          </FieldRow>
          <DeductionsPreview gross={Number(gross)} modality={modality ?? 'planilla'} schedule={schedule ?? 'monthly'} />
          <FieldRow>
            <Field label={t.payFrequency}>
              {() => (
                <Controller control={control} name="pay_schedule" render={({ field }) => (
                  <Segmented label={t.payFrequency} options={schedules} value={field.value ?? 'monthly'} onChange={field.onChange} />
                )} />
              )}
            </Field>
            {schedule === 'monthly' ? (
              <Field label={t.payDay}>
                {(id) => (
                  <Controller control={control} name="pay_day" render={({ field }) => (
                    <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} options={DAYS_OF_MONTH} />
                  )} />
                )}
              </Field>
            ) : (
              <p className="self-end pb-2 text-sm text-muted-foreground">{t.biweeklySplit}</p>
            )}
          </FieldRow>
          <FieldRow>
            <Field label={t.depositedIn} hint={t.depositedInHint}>
              {(id) => (
                <Controller control={control} name="account_id" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : NONE} onChange={(v) => field.onChange(v === NONE ? null : Number(v))} options={accountOptions} />
                )} />
              )}
            </Field>
            <Field label={t.paymentCategory}>
              {(id) => (
                <Controller control={control} name="category_id" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : NONE} onChange={(v) => field.onChange(v === NONE ? null : Number(v))} options={categoryOptions} />
                )} />
              )}
            </Field>
          </FieldRow>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
