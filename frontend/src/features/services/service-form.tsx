import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AmountInput, Field, FieldRow, FormActions, FormStack, SelectInput,
} from '@/components/shared/form';
import { IconPicker } from '@/components/shared/pickers';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import { useAccounts, useCategories } from '@/data/queries';
import type { RecurringService, RecurringServiceInput } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import { DAYS_OF_MONTH } from '@/lib/constants';
import { accountOptions } from '@/features/accounts/account-label';
import { useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';

const FORM_ID = 'service-form';
const NONE = 'none';

function buildSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.common.form.errors.nameRequired).max(100),
    amount: z.number({ error: t.services.form.amountRequired }).positive(t.common.form.errors.amountPositive),
    day_of_month: z.number().int().min(1).max(31),
    category_id: z.number().nullable(),
    account_id: z.number().nullable(),
    active: z.boolean(),
    icon: z.string(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface ServiceFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  service?: RecurringService | null;
}

/** Convierte el valor de un select opcional ('none' = sin asignar) a id o null. */
const toId = (value: string) => (value === NONE ? null : Number(value));

export function ServiceForm({ open, onOpenChange, service }: ServiceFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const accounts = useAccounts();
  const categories = useCategories('expense');
  const dictionary = useT();
  const t = dictionary.services.form;
  const common = dictionary.common;
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const close = () => onOpenChange(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen<FormValues>(open, reset, () => (service
    ? {
        name: service.name,
        amount: service.amount,
        day_of_month: service.day_of_month,
        category_id: service.category_id,
        account_id: service.account_id,
        active: service.active,
        icon: service.icon || 'zap',
      }
    : {
        name: '',
        amount: undefined as unknown as number,
        day_of_month: 1,
        category_id: null,
        account_id: null,
        active: true,
        icon: 'zap',
      }));
  const [categoryId, accountId] = useWatch({ control, name: ['category_id', 'account_id'] });

  const save = useAppMutation({
    mutationFn: (input: RecurringServiceInput) =>
      service ? source.services.update(service.id, input) : source.services.create(input),
    success: service ? t.updated : t.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.services.remove(id),
    success: t.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({ ...values, iconType: 'registry' }));

  async function handleDelete() {
    if (!service) return;
    const ok = await confirm({
      title: common.confirm.deleteTitle(service.name),
      description: t.deleteDescription,
    });
    if (ok) remove.mutate(service.id);
  }

  const categoryOptions = [
    { value: NONE, label: t.noCategory },
    ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const accountSelect = [{ value: NONE, label: t.noAccount }, ...accountOptions(accounts.data ?? [], dictionary)];
  const selectedCategory = categories.data?.find((c) => c.id === categoryId);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={service ? t.editTitle : t.newTitle}
      description={t.description}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={service ? common.actions.saveChanges : t.add}
          pending={save.isPending}
          onCancel={close}
          onDelete={service ? handleDelete : undefined}
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
            <Field label={t.monthlyAmount} error={errors.amount?.message} hint={t.monthlyAmountHint}>
              {(id) => <AmountInput id={id} aria-invalid={!!errors.amount || undefined} {...register('amount', { valueAsNumber: true })} />}
            </Field>
            <Field label={t.chargeDay}>
              {(id) => (
                <Controller control={control} name="day_of_month" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : ''} onChange={(v) => field.onChange(Number(v))} options={DAYS_OF_MONTH} />
                )} />
              )}
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={common.form.category}>
              {(id) => (
                <Controller control={control} name="category_id" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : NONE} onChange={(v) => field.onChange(toId(v))} options={categoryOptions} />
                )} />
              )}
            </Field>
            <Field label={t.paidFrom}>
              {(id) => (
                <Controller control={control} name="account_id" render={({ field }) => (
                  <SelectInput id={id} value={field.value ? String(field.value) : NONE} onChange={(v) => field.onChange(toId(v))} options={accountSelect} />
                )} />
              )}
            </Field>
          </FieldRow>
          {(!categoryId || !accountId) && (
            <p className="text-sm text-muted-foreground">{t.assignHint}</p>
          )}
          <Field label={t.icon}>
            {() => (
              <Controller control={control} name="icon" render={({ field }) => (
                <IconPicker value={field.value} onChange={field.onChange} color={selectedCategory?.color ?? undefined} />
              )} />
            )}
          </Field>
          <Controller control={control} name="active" render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="service-active">{t.active}</Label>
                <p className="text-sm text-muted-foreground">{t.activeHint}</p>
              </div>
              <Switch id="service-active" checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )} />
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
