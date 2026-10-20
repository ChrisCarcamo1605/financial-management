import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { AmountInput, Field, FieldRow, FormActions, FormStack, Segmented, SelectInput } from '@/components/shared/form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useCategories } from '@/data/queries';
import type { Budget, BudgetInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { DAYS_OF_MONTH } from '@/lib/constants';
import type { Dictionary } from '@/i18n';
import { useT } from '@/features/preferences/preferences-provider';
import { BUDGET_PERIODS, weekdayOptions } from './budget-labels';

const FORM_ID = 'budget-form';

function buildSchema(t: Dictionary) {
  return z.object({
    category_id: z.number({ error: t.common.form.errors.categoryRequired }),
    amount: z.number({ error: t.budgets.form.limitRequired }).positive(t.budgets.form.limitPositive),
    period: z.enum(['weekly', 'biweekly', 'monthly']),
    start_day: z.number().int().min(1).max(31).nullable(),
    end_date: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface BudgetFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  budget?: Budget | null;
}

function toFormValues(budget: Budget | null | undefined): FormValues {
  if (!budget) {
    return { period: 'monthly', start_day: 1, end_date: '', amount: undefined as unknown as number, category_id: undefined as unknown as number };
  }
  return {
    category_id: budget.category_id,
    amount: budget.amount,
    period: budget.period,
    start_day: budget.start_day,
    end_date: budget.end_date ?? '',
  };
}

export function BudgetForm({ open, onOpenChange, budget }: BudgetFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const categories = useCategories('expense');
  const t = useT();
  const tf = t.budgets.form;
  const close = () => onOpenChange(false);
  const schema = useMemo(() => buildSchema(t), [t]);
  const periodOptions = BUDGET_PERIODS.map((value) => ({ value, label: t.budgets.periods[value] }));

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen(open, reset, () => toFormValues(budget));
  const period = useWatch({ control, name: 'period' });

  const save = useAppMutation({
    mutationFn: (input: BudgetInput) => (budget ? source.budgets.update(budget.id, input) : source.budgets.create(input)),
    success: budget ? tf.updated : tf.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.budgets.remove(id),
    success: tf.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({
    ...values,
    start_day: values.period === 'biweekly' ? null : values.start_day,
    end_date: values.end_date || null,
  }));

  async function handleDelete() {
    if (!budget) return;
    const ok = await confirm({
      title: tf.deleteTitle(budget.category_name),
      description: tf.deleteDescription,
    });
    if (ok) remove.mutate(budget.id);
  }

  const categoryOptions = (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={budget ? tf.editTitle : tf.newTitle}
      description={tf.description}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={budget ? t.common.actions.saveChanges : tf.create}
          pending={save.isPending}
          onCancel={close}
          onDelete={budget ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <Field label={tf.category} error={errors.category_id?.message}>
            {(id) => (
              <Controller control={control} name="category_id" render={({ field }) => (
                <SelectInput id={id} options={categoryOptions} value={field.value ? String(field.value) : ''}
                  onChange={(v) => field.onChange(Number(v))} invalid={!!errors.category_id} />
              )} />
            )}
          </Field>
          <Field label={tf.limit} error={errors.amount?.message}>
            {(id) => <AmountInput id={id} aria-invalid={!!errors.amount || undefined} {...register('amount', { valueAsNumber: true })} />}
          </Field>
          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">{tf.resets}</span>
            <Controller control={control} name="period" render={({ field }) => (
              <Segmented
                label={tf.period}
                options={periodOptions}
                value={field.value ?? 'monthly'}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('start_day', next === 'biweekly' ? null : 1);
                }}
              />
            )} />
          </div>
          <FieldRow>
            {period === 'biweekly' ? (
              <p className="self-start rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {tf.biweeklyHint}
              </p>
            ) : (
              <Field className="content-start" label={period === 'weekly' ? tf.weekStarts : tf.monthStarts}>
                {(id) => (
                  <Controller control={control} name="start_day" render={({ field }) => (
                    <SelectInput
                      id={id}
                      options={period === 'weekly' ? weekdayOptions(t) : DAYS_OF_MONTH}
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(Number(v))}
                    />
                  )} />
                )}
              </Field>
            )}
            <Field className="content-start" label={tf.endDate} hint={tf.endDateHint}>
              {(id) => <Input id={id} type="date" {...register('end_date')} />}
            </Field>
          </FieldRow>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
