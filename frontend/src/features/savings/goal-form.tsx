import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AmountInput, Field, FieldRow, FormActions, FormStack, SelectInput } from '@/components/shared/form';
import { ColorPicker, IconPicker } from '@/components/shared/pickers';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts } from '@/data/queries';
import type { SavingsGoal, SavingsGoalInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import type { Dictionary } from '@/i18n';
import { useFormat, useT } from '@/features/preferences/preferences-provider';

const FORM_ID = 'goal-form';

const optionalDay = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

function buildSchema(t: Dictionary) {
  const tf = t.savings.form;
  const optionalAmount = z.number().nonnegative(tf.notNegative).optional().or(z.nan().transform(() => undefined));
  return z.object({
    name: z.string().trim().min(1, t.common.form.errors.nameRequired).max(100),
    target_amount: z.number({ error: tf.targetRequired }).positive(tf.targetPositive),
    current_amount: optionalAmount,
    q1: optionalAmount,
    q2: optionalAmount,
    day_q1: optionalDay(1, 15),
    day_q2: optionalDay(16, 31),
    account_id: z.number().nullable(),
    color: z.string(),
    icon: z.string(),
    active: z.boolean(),
  });
}

type GoalSchema = ReturnType<typeof buildSchema>;
type FormValues = z.input<GoalSchema>;
type ParsedValues = z.output<GoalSchema>;

const Q1_DAYS = Array.from({ length: 15 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const Q2_DAYS = Array.from({ length: 16 }, (_, i) => ({ value: String(i + 16), label: String(i + 16) }));
const NO_ACCOUNT = 'none';

function toFormValues(goal: SavingsGoal | null | undefined): FormValues {
  return {
    name: goal?.name ?? '',
    target_amount: goal?.target_amount ?? (undefined as unknown as number),
    current_amount: goal ? goal.current_amount : 0,
    q1: goal?.per_quincena_q1 ?? (goal ? goal.per_quincena / 2 : undefined),
    q2: goal?.per_quincena_q2 ?? (goal ? goal.per_quincena / 2 : undefined),
    day_q1: goal?.day_q1 ?? 15,
    day_q2: goal?.day_q2 ?? 30,
    account_id: goal?.account_id ?? null,
    color: goal?.color ?? '#2a78d6',
    icon: goal?.icon ?? 'savings',
    active: goal?.active ?? true,
  };
}

interface GoalFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  goal?: SavingsGoal | null;
}

export function GoalForm({ open, onOpenChange, goal }: GoalFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const fmt = useFormat();
  const accounts = useAccounts();
  const t = useT();
  const tf = t.savings.form;
  const schema = useMemo(() => buildSchema(t), [t]);
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen(open, reset, () => toFormValues(goal));
  const [q1, q2, color] = useWatch({ control, name: ['q1', 'q2', 'color'] });
  const monthly = (Number(q1) || 0) + (Number(q2) || 0);

  const save = useAppMutation({
    mutationFn: (input: SavingsGoalInput) => (goal ? source.savings.update(goal.id, input) : source.savings.create(input)),
    success: goal ? tf.updated : tf.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.savings.remove(id),
    success: tf.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => {
    const q1Amount = values.q1 ?? 0;
    const q2Amount = values.q2 ?? 0;
    const input: SavingsGoalInput = {
      name: values.name,
      target_amount: values.target_amount,
      per_quincena: q1Amount + q2Amount,
      per_quincena_q1: q1Amount,
      account_id: values.account_id,
      day_q1: values.day_q1,
      day_q2: values.day_q2,
      color: values.color,
      icon: values.icon,
      iconType: 'registry',
      active: values.active,
    };
    if (!goal) input.current_amount = values.current_amount ?? 0;
    save.mutate(input);
  });

  async function handleDelete() {
    if (!goal) return;
    const ok = await confirm({
      title: t.common.confirm.deleteTitle(goal.name),
      description: tf.deleteDescription,
    });
    if (ok) remove.mutate(goal.id);
  }

  const accountOptions = [
    { value: NO_ACCOUNT, label: tf.noAccount },
    ...(accounts.data ?? []).filter((a) => a.type === 'normal').map((a) => ({ value: String(a.id), label: a.name })),
  ];
  const fieldErrors = errors as Partial<Record<string, { message?: string }>>;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? tf.editTitle : tf.newTitle}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={goal ? t.common.actions.saveChanges : tf.create}
          pending={save.isPending}
          onCancel={close}
          onDelete={goal ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <Field label={t.common.form.name} error={errors.name?.message}>
            {(id) => <Input id={id} placeholder={tf.namePlaceholder} aria-invalid={!!errors.name || undefined} {...register('name')} />}
          </Field>
          <FieldRow>
            <Field className="content-start" label={tf.target} error={errors.target_amount?.message}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.target_amount || undefined} {...register('target_amount', { valueAsNumber: true })} />}
            </Field>
            {!goal && (
              <Field className="content-start" label={tf.alreadySaved} hint={t.common.form.optional} error={fieldErrors.current_amount?.message}>
                {(id) => <AmountInput id={id} {...register('current_amount', { valueAsNumber: true })} />}
              </Field>
            )}
          </FieldRow>

          <fieldset className="grid gap-4 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">{tf.perQuincena}</legend>
            <FieldRow className="grid-cols-[1fr_6rem] sm:grid-cols-[1fr_6rem]">
              <Field label={tf.firstHalf} error={fieldErrors.q1?.message}>
                {(id) => <AmountInput id={id} {...register('q1', { valueAsNumber: true })} />}
              </Field>
              <Field label={tf.day}>
                {(id) => <DaySelect id={id} control={control} name="day_q1" options={Q1_DAYS} />}
              </Field>
            </FieldRow>
            <FieldRow className="grid-cols-[1fr_6rem] sm:grid-cols-[1fr_6rem]">
              <Field label={tf.secondHalf} error={fieldErrors.q2?.message}>
                {(id) => <AmountInput id={id} {...register('q2', { valueAsNumber: true })} />}
              </Field>
              <Field label={tf.day}>
                {(id) => <DaySelect id={id} control={control} name="day_q2" options={Q2_DAYS} />}
              </Field>
            </FieldRow>
            <p className="text-sm text-muted-foreground">
              {tf.monthly} <span className="font-medium text-foreground tabular">{fmt.money(monthly)}</span>
            </p>
          </fieldset>

          <Field label={tf.account} hint={tf.accountHint}>
            {(id) => (
              <Controller control={control} name="account_id" render={({ field }) => (
                <SelectInput
                  id={id}
                  options={accountOptions}
                  value={field.value ? String(field.value) : NO_ACCOUNT}
                  onChange={(v) => field.onChange(v === NO_ACCOUNT ? null : Number(v))}
                />
              )} />
            )}
          </Field>

          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">{tf.color}</span>
            <Controller control={control} name="color" render={({ field }) => (
              <ColorPicker label={tf.colorLabel} value={field.value ?? '#2a78d6'} onChange={field.onChange} />
            )} />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">{tf.icon}</span>
            <Controller control={control} name="icon" render={({ field }) => (
              <IconPicker value={field.value ?? 'savings'} onChange={field.onChange} color={color} />
            )} />
          </div>

          {goal && (
            <Controller control={control} name="active" render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <Label htmlFor="goal-active">{tf.active}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{tf.activeHint}</p>
                </div>
                <Switch id="goal-active" checked={!!field.value} onCheckedChange={field.onChange} />
              </div>
            )} />
          )}
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}

type FormControl = ReturnType<typeof useForm<FormValues, unknown, ParsedValues>>['control'];

function DaySelect({ id, control, name, options }: {
  id: string;
  control: FormControl;
  name: 'day_q1' | 'day_q2';
  options: { value: string; label: string }[];
}) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <SelectInput id={id} options={options} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} />
    )} />
  );
}
