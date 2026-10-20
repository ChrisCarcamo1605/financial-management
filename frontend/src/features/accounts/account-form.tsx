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
import { useAppMutation } from '@/data/mutations';
import type { Account, AccountInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { DAYS_OF_MONTH } from '@/lib/constants';
import { toISODate } from '@/lib/dates';
import { currencyOptions as buildCurrencyOptions } from '@/features/preferences/defaults';
import { usePreferences, useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';

const FORM_ID = 'account-form';

function buildSchema(t: Dictionary) {
  const name = z.string().trim().min(1, t.common.form.errors.nameRequired).max(100);
  return z.discriminatedUnion('type', [
    z.object({
      type: z.literal('normal'),
      name,
      currency: z.string().length(3),
      balance: z.number({ error: t.accounts.form.balanceRequired }),
    }),
    z.object({
      type: z.literal('tarjeta_credito'),
      name,
      currency: z.string().length(3),
      credit_limit: z.number({ error: t.accounts.form.creditLimitRequired }).nonnegative(),
      cutoff_day: z.number().int().min(1).max(31),
      payment_due_day: z.number().int().min(1).max(31),
      start_date: z.string().optional(),
    }),
  ]);
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface AccountFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  account?: Account | null;
}

function toFormValues(account: Account | null | undefined, currency: string): FormValues {
  if (account?.type === 'tarjeta_credito') {
    return {
      type: 'tarjeta_credito',
      name: account.name,
      currency: account.currency,
      credit_limit: account.credit_limit ?? 0,
      cutoff_day: account.cutoff_day ?? 1,
      payment_due_day: account.payment_due_day ?? 15,
      start_date: account.start_date ?? '',
    };
  }
  return { type: 'normal', name: account?.name ?? '', currency: account?.currency ?? currency, balance: account?.balance ?? (undefined as unknown as number) };
}

export function AccountForm({ open, onOpenChange, account }: AccountFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const { preferences, t: dictionary } = usePreferences();
  const t = dictionary.accounts.form;
  const close = () => onOpenChange(false);
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const typeOptions = [
    { value: 'normal' as const, label: t.typeNormal },
    { value: 'tarjeta_credito' as const, label: t.typeCard },
  ];

  const { register, control, handleSubmit, reset, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen(open, reset, () => toFormValues(account, preferences.currency));
  const type = useWatch({ control, name: 'type' });
  // Errores de campos que solo existen en una de las variantes.
  const fieldErrors = errors as Partial<Record<string, { message?: string }>>;

  const save = useAppMutation({
    mutationFn: (input: AccountInput) => (account ? source.accounts.update(account.id, input) : source.accounts.create(input)),
    success: account ? t.updated : t.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.accounts.remove(id),
    success: t.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate(
    values.type === 'tarjeta_credito' ? { ...values, start_date: values.start_date || null } : values,
  ));

  async function handleDelete() {
    if (!account) return;
    const ok = await confirm({
      title: dictionary.common.confirm.deleteTitle(account.name),
      description: t.deleteDescription,
    });
    if (ok) remove.mutate(account.id);
  }

  const currencyOptions = buildCurrencyOptions(dictionary);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={account ? t.editTitle : t.newTitle}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={account ? dictionary.common.actions.saveChanges : t.create}
          pending={save.isPending}
          onCancel={close}
          onDelete={account ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          {!account && (
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Segmented
                  label={t.type}
                  options={typeOptions}
                  value={field.value ?? 'normal'}
                  onChange={(next) => reset({ ...toFormValues(null, getValues('currency')), ...(next === 'tarjeta_credito'
                    ? { type: next, cutoff_day: 20, payment_due_day: 5, start_date: toISODate(), credit_limit: undefined as unknown as number }
                    : { type: next }), name: getValues('name') } as FormValues)}
                />
              )}
            />
          )}
          <Field label={dictionary.common.form.name} error={errors.name?.message}>
            {(id) => <Input id={id} placeholder={type === 'tarjeta_credito' ? t.namePlaceholderCard : t.namePlaceholderAccount} aria-invalid={!!errors.name || undefined} {...register('name')} />}
          </Field>

          {type === 'tarjeta_credito' ? (
            <>
              <FieldRow>
                <Field label={t.creditLimit} error={fieldErrors.credit_limit?.message}>
                  {(id) => <AmountInput id={id} {...register('credit_limit', { valueAsNumber: true })} />}
                </Field>
                <CurrencyField control={control} options={currencyOptions} />
              </FieldRow>
              <FieldRow>
                <Field label={t.cutoffDay} hint={t.cutoffHint}>
                  {(id) => <DayField id={id} control={control} name="cutoff_day" />}
                </Field>
                <Field label={t.dueDay}>
                  {(id) => <DayField id={id} control={control} name="payment_due_day" />}
                </Field>
              </FieldRow>
              <Field label={t.startDate} hint={t.startDateHint}>
                {(id) => <Input id={id} type="date" {...register('start_date')} />}
              </Field>
            </>
          ) : (
            <FieldRow>
              <Field label={t.balance} error={fieldErrors.balance?.message} hint={account ? t.balanceHint : undefined}>
                {(id) => <Input id={id} type="number" inputMode="decimal" step="0.01" placeholder="0.00" className="tabular" {...register('balance', { valueAsNumber: true })} />}
              </Field>
              <CurrencyField control={control} options={currencyOptions} />
            </FieldRow>
          )}
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}

type FormControl = ReturnType<typeof useForm<FormValues>>['control'];

function CurrencyField({ control, options }: { control: FormControl; options: { value: string; label: string }[] }) {
  const t = useT();
  return (
    <Field label={t.common.form.currency}>
      {(id) => (
        <Controller control={control} name="currency" render={({ field }) => (
          <SelectInput id={id} value={field.value} onChange={field.onChange} options={options} />
        )} />
      )}
    </Field>
  );
}

function DayField({ id, control, name }: { id: string; control: FormControl; name: 'cutoff_day' | 'payment_due_day' }) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} options={DAYS_OF_MONTH} />
    )} />
  );
}
