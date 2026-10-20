import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { AmountInput, Field, FieldRow, FormActions, FormStack, SelectInput } from '@/components/shared/form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts } from '@/data/queries';
import type { TransferInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { toISODate } from '@/lib/dates';
import { useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';
import { accountOptions } from './account-label';

const FORM_ID = 'transfer-form';

function buildSchema(t: Dictionary) {
  const { errors } = t.common.form;
  return z.object({
    from_account_id: z.number({ error: t.accounts.transfer.fromRequired }),
    to_account_id: z.number({ error: t.accounts.transfer.toRequired }),
    amount: z.number({ error: errors.amountRequired }).positive(errors.amountPositive),
    date: z.string().min(1, errors.dateRequired),
    description: z.string().max(200).optional(),
  }).refine((v) => v.from_account_id !== v.to_account_id, {
    path: ['to_account_id'],
    message: t.accounts.transfer.sameAccount,
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface TransferFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Destino preseleccionado, p. ej. al pagar una tarjeta. */
  toAccountId?: number;
  amount?: number;
}

export function TransferForm({ open, onOpenChange, toAccountId, amount }: TransferFormProps) {
  const source = useDataSource();
  const accounts = useAccounts();
  const dictionary = useT();
  const { common } = dictionary;
  const t = dictionary.accounts.transfer;
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const options = accountOptions(accounts.data ?? [], dictionary);
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen(open, reset, () => ({
    date: toISODate(),
    description: '',
    to_account_id: toAccountId,
    amount,
    from_account_id: accounts.data?.find((a) => a.type === 'normal' && a.id !== toAccountId)?.id,
  }) as FormValues);

  const save = useAppMutation({
    mutationFn: (input: TransferInput) => source.transfers.create(input),
    success: t.created,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({ ...values, description: values.description?.trim() || null }));

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.formTitle}
      description={t.formDescription}
      footer={<FormActions formId={FORM_ID} submitLabel={common.actions.transfer} pending={save.isPending} onCancel={close} />}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <FieldRow>
            <Field label={t.from} error={errors.from_account_id?.message}>
              {(id) => (
                <Controller control={control} name="from_account_id" render={({ field }) => (
                  <SelectInput id={id} options={options} value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(Number(v))} invalid={!!errors.from_account_id} />
                )} />
              )}
            </Field>
            <Field label={t.to} error={errors.to_account_id?.message}>
              {(id) => (
                <Controller control={control} name="to_account_id" render={({ field }) => (
                  <SelectInput id={id} options={options} value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(Number(v))} invalid={!!errors.to_account_id} />
                )} />
              )}
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={common.form.amount} error={errors.amount?.message}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.amount || undefined} {...register('amount', { valueAsNumber: true })} />}
            </Field>
            <Field label={common.form.date} error={errors.date?.message}>
              {(id) => <Input id={id} type="date" {...register('date')} />}
            </Field>
          </FieldRow>
          <Field label={common.form.description} hint={common.form.optional}>
            {(id) => <Input id={id} placeholder={t.descriptionPlaceholder} {...register('description')} />}
          </Field>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
