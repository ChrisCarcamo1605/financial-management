import { useMemo } from 'react';
import { Link } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import {
  AmountInput, Field, FieldRow, FormActions, FormStack, Segmented, SelectInput,
} from '@/components/shared/form';
import { Money } from '@/components/shared/money';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts, useCategories, useIncomeSources } from '@/data/queries';
import type { Loan, LoanInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { DAYS_OF_MONTH } from '@/lib/constants';
import { toISODate } from '@/lib/dates';
import { accountOptions } from '@/features/accounts/account-label';
import { useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';
import { estimateLoan } from './estimate';
import { methodOptions, paymentTypeOptions } from './labels';

const FORM_ID = 'loan-form';
const NONE = 'none';

function buildSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.common.form.errors.nameRequired).max(100),
    principal: z.number({ error: t.loans.form.principalRequired }).positive(t.common.form.errors.amountPositive),
    interest_rate: z.number({ error: t.loans.form.rateRequired }).min(0).max(200),
    interest_method: z.enum(['french', 'simple']),
    payment_type: z.enum(['monthly', 'biweekly', 'single']),
    installments: z.number().nullable(),
    payment_day: z.number().int().min(1).max(31).nullable(),
    start_date: z.string().min(1, t.common.form.errors.dateRequired),
    income_source_id: z.number({ error: t.loans.form.paidWithRequired }),
    category_id: z.number().nullable(),
    account_id: z.number().nullable(),
}).refine((v) => v.payment_type === 'single' || (v.installments != null && v.installments >= 1), {
    path: ['installments'],
    message: t.loans.form.installmentsRequired,
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface LoanFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  loan?: Loan | null;
}

const toId = (value: string) => (value === NONE ? null : Number(value));

export function LoanForm({ open, onOpenChange, loan }: LoanFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const incomeSources = useIncomeSources();
  const accounts = useAccounts();
  const categories = useCategories('expense');
  const dictionary = useT();
  const t = dictionary.loans.form;
  const common = dictionary.common;
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const methods = useMemo(() => methodOptions(dictionary), [dictionary]);
  const paymentTypes = useMemo(() => paymentTypeOptions(dictionary), [dictionary]);
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen<FormValues>(open, reset, () => (loan
    ? {
        name: loan.name,
        principal: loan.principal,
        interest_rate: loan.interest_rate,
        interest_method: loan.interest_method,
        payment_type: loan.payment_type,
        installments: loan.installments,
        payment_day: loan.payment_day,
        start_date: loan.start_date,
        income_source_id: loan.income_source_id,
        category_id: loan.category_id,
        account_id: loan.account_id,
      }
    : {
        name: '',
        principal: undefined as unknown as number,
        interest_rate: 0,
        interest_method: 'french',
        payment_type: 'monthly',
        installments: 12,
        payment_day: new Date().getDate(),
        start_date: toISODate(),
        income_source_id: incomeSources.data?.[0]?.id as number,
        category_id: null,
        account_id: null,
      }));

  const [principal, rate, method, paymentType, installments] = useWatch({
    control,
    name: ['principal', 'interest_rate', 'interest_method', 'payment_type', 'installments'],
  });
  const estimate = estimateLoan({
    principal: Number(principal),
    rate: Number(rate) || 0,
    method: method ?? 'french',
    paymentType: paymentType ?? 'monthly',
    installments: Number(installments) || 1,
  });

  const save = useAppMutation({
    mutationFn: (input: LoanInput) => (loan ? source.loans.update(loan.id, input) : source.loans.create(input)),
    success: loan ? t.updated : t.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.loans.remove(id),
    success: t.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({
    ...values,
    installments: values.payment_type === 'single' ? null : values.installments,
    payment_day: values.payment_type === 'monthly' ? values.payment_day : null,
  }));

  async function handleDelete() {
    if (!loan) return;
    const ok = await confirm({
      title: common.confirm.deleteTitle(loan.name),
      description: t.deleteDescription,
    });
    if (ok) remove.mutate(loan.id);
  }

  const noIncome = incomeSources.isSuccess && incomeSources.data.length === 0;
  const sourceOptions = (incomeSources.data ?? []).map((s) => ({ value: String(s.id), label: s.name }));
  const categoryOptions = [{ value: NONE, label: t.noCategory }, ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))];
  const accountSelect = [{ value: NONE, label: t.noAccount }, ...accountOptions(accounts.data ?? [], dictionary)];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={loan ? t.editTitle : t.newTitle}
      description={loan ? t.editDescription : t.newDescription}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={loan ? common.actions.saveChanges : t.add}
          pending={save.isPending}
          onCancel={close}
          onDelete={loan ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <Field label={common.form.name} error={errors.name?.message}>
            {(id) => <Input id={id} placeholder={t.namePlaceholder} aria-invalid={!!errors.name || undefined} {...register('name')} />}
          </Field>
          <FieldRow>
            <Field label={t.principal} error={errors.principal?.message}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.principal || undefined} {...register('principal', { valueAsNumber: true })} />}
            </Field>
            <Field label={t.rate} error={errors.interest_rate?.message}>
              {(id) => <Input id={id} type="number" inputMode="decimal" step="0.01" min="0" className="tabular" {...register('interest_rate', { valueAsNumber: true })} />}
            </Field>
          </FieldRow>
          <Field label={t.method}>
            {() => (
              <Controller control={control} name="interest_method" render={({ field }) => (
                <Segmented label={t.method} size="sm" options={methods} value={field.value ?? 'french'} onChange={field.onChange} />
              )} />
            )}
          </Field>
          <Field label={t.paymentType}>
            {() => (
              <Controller control={control} name="payment_type" render={({ field }) => (
                <Segmented label={t.paymentType} size="sm" options={paymentTypes} value={field.value ?? 'monthly'} onChange={field.onChange} />
              )} />
            )}
          </Field>
          <FieldRow>
            {paymentType !== 'single' && (
              <Field label={t.installments} error={errors.installments?.message}>
                {(id) => <Input id={id} type="number" inputMode="numeric" min="1" step="1" className="tabular" {...register('installments', { valueAsNumber: true })} />}
              </Field>
            )}
            {paymentType === 'monthly' && (
              <Field label={t.paymentDay}>
                {(id) => (
                  <Controller control={control} name="payment_day" render={({ field }) => (
                    <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} options={DAYS_OF_MONTH} />
                  )} />
                )}
              </Field>
            )}
            <Field
              label={paymentType === 'single' ? t.paymentDate : t.startDate}
              error={errors.start_date?.message}
              hint={paymentType === 'biweekly' ? t.biweeklyHint : undefined}
            >
              {(id) => <Input id={id} type="date" {...register('start_date')} />}
            </Field>
          </FieldRow>

          {estimate && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm" aria-live="polite">
              <span className="text-muted-foreground">
                {paymentType === 'single' ? t.estimatedSingle : t.estimatedInstallment(paymentType === 'biweekly')}
                {paymentType !== 'single' && <> ({t.total} <Money value={estimate.total} />)</>}
              </span>
              <Money value={estimate.installment} className="text-base font-semibold" />
            </div>
          )}

          <Field
            label={t.paidWith}
            error={errors.income_source_id?.message}
            hint={noIncome ? undefined : t.paidWithHint}
          >
            {(id) => noIncome ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                {t.noIncomeBefore} <Link to="/ingresos" className="font-medium text-primary underline-offset-4 hover:underline">{t.noIncomeLink}</Link>.
              </p>
            ) : (
              <Controller control={control} name="income_source_id" render={({ field }) => (
                <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} options={sourceOptions} invalid={!!errors.income_source_id} />
              )} />
            )}
          </Field>
          <FieldRow>
            <Field label={t.expenseCategory}>
              {(id) => (
                <Controller control={control} name="category_id" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : NONE} onChange={(v) => field.onChange(toId(v))} options={categoryOptions} />
                )} />
              )}
            </Field>
            <Field label={t.paymentAccount}>
              {(id) => (
                <Controller control={control} name="account_id" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : NONE} onChange={(v) => field.onChange(toId(v))} options={accountSelect} />
                )} />
              )}
            </Field>
          </FieldRow>
          <p className="text-sm text-muted-foreground">{t.autoTransactionHint}</p>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
