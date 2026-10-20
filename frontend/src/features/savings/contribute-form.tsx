import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { AmountInput, Field, FieldRow, FormActions, FormStack } from '@/components/shared/form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import type { ContributionInput, SavingsGoal } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { toISODate } from '@/lib/dates';
import type { Dictionary } from '@/i18n';
import { useT } from '@/features/preferences/preferences-provider';

const FORM_ID = 'contribute-form';

function buildSchema(t: Dictionary) {
  const e = t.common.form.errors;
  return z.object({
    amount: z.number({ error: e.amountRequired }).positive(e.amountPositive),
    date: z.string().min(1, e.dateRequired),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface ContributeFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  goal: SavingsGoal | null;
}

/** Aporte manual: suma a la meta sin crear un movimiento en tus cuentas. */
export function ContributeForm({ open, onOpenChange, goal }: ContributeFormProps) {
  const source = useDataSource();
  const t = useT();
  const schema = useMemo(() => buildSchema(t), [t]);
  const close = () => onOpenChange(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  useResetOnOpen(open, reset, () => ({ amount: undefined as unknown as number, date: toISODate() }));

  const save = useAppMutation({
    mutationFn: (input: ContributionInput) => source.savings.contribute(goal!.id, input),
    success: t.savings.contribute.created,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({ ...values, source: 'manual' }));

  return (
    <ResponsiveDialog
      mobileHeight="fit"
      open={open}
      onOpenChange={onOpenChange}
      title={t.savings.contribute.title(goal?.name ?? null)}
      description={t.savings.contribute.description}
      footer={<FormActions formId={FORM_ID} submitLabel={t.savings.contribute.submit} pending={save.isPending} onCancel={close} />}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <FieldRow>
            <Field label={t.common.form.amount} error={errors.amount?.message}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.amount || undefined} {...register('amount', { valueAsNumber: true })} />}
            </Field>
            <Field label={t.common.form.date} error={errors.date?.message}>
              {(id) => <Input id={id} type="date" {...register('date')} />}
            </Field>
          </FieldRow>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
