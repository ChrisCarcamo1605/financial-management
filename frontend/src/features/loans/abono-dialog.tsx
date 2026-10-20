import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { AmountInput, Field, FieldRow, FormActions, FormStack, SelectInput } from '@/components/shared/form';
import { Money } from '@/components/shared/money';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts, useCategories } from '@/data/queries';
import type { Loan, TransactionInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { toISODate } from '@/lib/dates';
import { accountOptions } from '@/features/accounts/account-label';
import { useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';

const FORM_ID = 'abono-form';

function buildSchema(t: Dictionary) {
  return z.object({
    amount: z.number({ error: t.loans.extra.amountRequired }).positive(t.common.form.errors.amountPositive),
    date: z.string().min(1, t.common.form.errors.dateRequired),
    account_id: z.number({ error: t.loans.extra.accountRequired }),
    category_id: z.number({ error: t.loans.extra.categoryRequired }),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface AbonoDialogProps {
  loan: Loan | null;
  onOpenChange(open: boolean): void;
}

/** Abono extra: un gasto vinculado al préstamo que salda primero las cuotas más próximas. */
export function AbonoDialog({ loan, onOpenChange }: AbonoDialogProps) {
  const source = useDataSource();
  const accounts = useAccounts();
  const categories = useCategories('expense');
  const dictionary = useT();
  const t = dictionary.loans.extra;
  const common = dictionary.common;
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const open = loan !== null;
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen<FormValues>(open, reset, () => ({
    amount: undefined as unknown as number,
    date: toISODate(),
    account_id: loan?.account_id as number,
    category_id: loan?.category_id as number,
  }));

  const save = useAppMutation({
    mutationFn: (input: TransactionInput) => source.transactions.create(input),
    success: t.registered,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => {
    if (!loan) return;
    save.mutate({ ...values, type: 'expense', description: t.transactionDescription(loan.name), loan_id: loan.id });
  });

  const needsAccount = !loan?.account_id;
  const needsCategory = !loan?.category_id;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={loan ? t.title(loan.name) : t.fallbackTitle}
      description={t.description}
      footer={<FormActions formId={FORM_ID} submitLabel={t.submit} pending={save.isPending} onCancel={close} />}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          {loan && (
            <p className="flex justify-between rounded-md border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">{t.remaining}</span>
              <Money value={loan.remaining} className="font-semibold" />
            </p>
          )}
          <FieldRow>
            <Field label={common.form.amount} error={errors.amount?.message}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.amount || undefined} {...register('amount', { valueAsNumber: true })} />}
            </Field>
            <Field label={common.form.date} error={errors.date?.message}>
              {(id) => <Input id={id} type="date" {...register('date')} />}
            </Field>
          </FieldRow>
          {(needsAccount || needsCategory) && (
            <FieldRow>
              {needsAccount && (
                <Field label={common.form.account} error={errors.account_id?.message}>
                  {(id) => (
                    <Controller control={control} name="account_id" render={({ field }) => (
                      <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} options={accountOptions(accounts.data ?? [], dictionary)} invalid={!!errors.account_id} />
                    )} />
                  )}
                </Field>
              )}
              {needsCategory && (
                <Field label={common.form.category} error={errors.category_id?.message}>
                  {(id) => (
                    <Controller control={control} name="category_id" render={({ field }) => (
                      <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))}
                        options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} invalid={!!errors.category_id} />
                    )} />
                  )}
                </Field>
              )}
            </FieldRow>
          )}
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
