import { useId, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Field, FieldRow, FormActions, FormStack, Segmented, SelectInput } from '@/components/shared/form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts, useCategories, useIncomeSources } from '@/data/queries';
import type { Category, IncomeSource, Transaction, TransactionInput, TxType } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { toISODate } from '@/lib/dates';
import { accountOptions } from '@/features/accounts/account-label';
import { CategoryGrid } from '@/features/categories/category-grid';
import { IncomeSourcePicker } from '@/features/income/income-source-picker';
import { useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';

const FORM_ID = 'transaction-form';

function buildSchema(t: Dictionary) {
  const { errors } = t.common.form;
  return z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number({ error: errors.amountRequired }).positive(errors.amountPositive),
    date: z.string().min(1, errors.dateRequired),
    description: z.string().max(200).optional(),
    account_id: z.number({ error: errors.accountRequired }),
    category_id: z.number({ error: errors.categoryRequired }),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export interface TransactionFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Movimiento a editar; si se omite se registra uno nuevo. */
  transaction?: Transaction | null;
  defaultType?: TxType;
  /** Abre el formulario como cobro de esta fuente de ingreso. */
  incomeSourceId?: number | null;
}

const SALARY_CATEGORY = /salario|sueldo|n[oó]mina/i;

/**
 * Fuentes que se ofrecen al elegir una categoría de ingreso: las vinculadas a esa
 * categoría; si ninguna lo está y la categoría es de salario, todas.
 */
function incomeSourcesFor(categoryId: number | undefined, sources: IncomeSource[], categories: Category[]) {
  if (!categoryId) return [];
  const linked = sources.filter((s) => s.category_id === categoryId);
  if (linked.length) return linked;
  const category = categories.find((c) => c.id === categoryId);
  return category && SALARY_CATEGORY.test(category.name) ? sources : [];
}

/** Valores de un cobro de la fuente: neto por pago y, si están configuradas, cuenta y categoría. */
function fromIncomeSource(source: IncomeSource): Partial<FormValues> {
  return {
    type: 'income',
    amount: source.net_per_payment,
    description: source.name,
    ...(source.account_id ? { account_id: source.account_id } : {}),
    ...(source.category_id ? { category_id: source.category_id } : {}),
  };
}

export function TransactionForm({ open, onOpenChange, transaction, defaultType = 'expense', incomeSourceId = null }: TransactionFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const accounts = useAccounts();
  const categories = useCategories();
  const incomeSources = useIncomeSources();
  const categoryLabelId = useId();
  const dictionary = useT();
  const { common } = dictionary;
  const t = dictionary.transactions.form;
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const typeOptions = [
    { value: 'expense' as const, label: t.expense },
    { value: 'income' as const, label: t.income },
  ];
  const [sourceId, setSourceId] = useState<number | null>(null);
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useResetOnOpen(open, reset, () => {
    const preset = incomeSources.data?.find((s) => s.id === incomeSourceId);
    setSourceId(preset?.id ?? null);
    if (transaction) return {
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description ?? '',
        account_id: transaction.account_id,
        category_id: transaction.category_id,
      };
    const base = { type: defaultType, date: toISODate(), description: '', account_id: accounts.data?.[0]?.id } as FormValues;
    return preset ? { ...base, ...fromIncomeSource(preset) } as FormValues : base;
  });

  function selectIncomeSource(source: IncomeSource) {
    setSourceId(source.id);
    for (const [field, value] of Object.entries(fromIncomeSource(source))) {
      setValue(field as keyof FormValues, value as never, { shouldValidate: true });
    }
  }

  const type = useWatch({ control, name: 'type' });
  const categoryId = useWatch({ control, name: 'category_id' });
  const visibleCategories = (categories.data ?? []).filter((c) => c.type === type);
  const sourcesForCategory = incomeSourcesFor(categoryId, incomeSources.data ?? [], categories.data ?? []);

  const save = useAppMutation({
    mutationFn: (input: TransactionInput) =>
      transaction ? source.transactions.update(transaction.id, input) : source.transactions.create(input),
    success: transaction ? t.updated : t.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.transactions.remove(id),
    success: t.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) =>
    save.mutate({ ...values, description: values.description?.trim() || null, loan_id: transaction?.loan_id ?? null }),
  );

  async function handleDelete() {
    if (!transaction) return;
    const ok = await confirm({
      title: t.deleteTitle,
      description: t.deleteDescription,
    });
    if (ok) remove.mutate(transaction.id);
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? t.editTitle : t.newTitle}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={transaction ? common.actions.saveChanges : t.submitNew}
          pending={save.isPending}
          onCancel={close}
          onDelete={transaction ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Segmented
                label={dictionary.transactions.typeLabel}
                options={typeOptions}
                value={field.value ?? 'expense'}
                onChange={(next) => {
                  field.onChange(next);
                  setSourceId(null);
                  setValue('category_id', undefined as unknown as number);
                }}
              />
            )}
          />


          <Field label={common.form.amount} error={errors.amount?.message}>
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="h-14 text-3xl font-semibold tabular md:text-3xl"
                aria-invalid={!!errors.amount || undefined}
                {...register('amount', { valueAsNumber: true })}
              />
            )}
          </Field>

          <div className="grid gap-1.5">
            <span id={categoryLabelId} className="text-sm leading-none font-medium">{common.form.category}</span>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <CategoryGrid
                  categories={visibleCategories}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.category_id}
                  labelledBy={categoryLabelId}
                />
              )}
            />
            {errors.category_id && <p className="text-xs text-destructive" role="alert">{errors.category_id.message}</p>}
          </div>

          {type === 'income' && !transaction && sourcesForCategory.length > 0 && (
            <div className="grid gap-1.5">
              <span className="text-sm leading-none font-medium">{t.whichIncome}</span>
              <IncomeSourcePicker sources={sourcesForCategory} value={sourceId} onSelect={selectIncomeSource} />
            </div>
          )}

          <FieldRow>
            <Field label={common.form.account} error={errors.account_id?.message}>
              {(id) => (
                <Controller
                  control={control}
                  name="account_id"
                  render={({ field }) => (
                    <SelectInput
                      id={id}
                      value={field.value ? String(field.value) : ''}
                      onChange={(value) => field.onChange(Number(value))}
                      options={accountOptions(accounts.data ?? [], dictionary)}
                      invalid={!!errors.account_id}
                    />
                  )}
                />
              )}
            </Field>
            <Field label={common.form.date} error={errors.date?.message}>
              {(id) => <Input id={id} type="date" {...register('date')} />}
            </Field>
          </FieldRow>

          <Field label={common.form.description} hint={t.descriptionHint}>
            {(id) => <Input id={id} placeholder={t.descriptionPlaceholder} maxLength={200} {...register('description')} />}
          </Field>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
