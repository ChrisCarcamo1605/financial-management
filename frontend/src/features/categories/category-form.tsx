import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Field, FormActions, FormStack, Segmented } from '@/components/shared/form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ColorPicker, IconPicker } from '@/components/shared/pickers';
import { IconBadge } from '@/components/shared/category-icon';
import { useConfirm } from '@/components/shared/confirm';
import { useDataSource } from '@/data/provider';
import { useAppMutation } from '@/data/mutations';
import type { Category, CategoryInput, TxType } from '@/data/types';
import { useResetOnOpen } from '@/hooks/use-reset-on-open';
import type { Dictionary } from '@/i18n';
import { useT } from '@/features/preferences/preferences-provider';

const FORM_ID = 'category-form';

function buildSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.common.form.errors.nameRequired).max(100),
    type: z.enum(['income', 'expense']),
    color: z.string().regex(/^#[0-9a-f]{6}$/i, t.categories.form.colorRequired),
    icon: z.string().min(1, t.categories.form.iconRequired),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  category?: Category | null;
  defaultType?: TxType;
}

export function CategoryForm({ open, onOpenChange, category, defaultType = 'expense' }: CategoryFormProps) {
  const source = useDataSource();
  const confirm = useConfirm();
  const dictionary = useT();
  const t = dictionary.categories.form;
  const close = () => onOpenChange(false);
  const schema = useMemo(() => buildSchema(dictionary), [dictionary]);
  const typeOptions = [
    { value: 'expense' as const, label: t.expense },
    { value: 'income' as const, label: t.income },
  ];

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  useResetOnOpen(open, reset, () => ({
    name: category?.name ?? '',
    type: category?.type ?? defaultType,
    color: category?.color ?? '#0e7c86',
    icon: category?.icon ?? 'tag',
  }));
  const [color, icon, name] = useWatch({ control, name: ['color', 'icon', 'name'] });

  const save = useAppMutation({
    mutationFn: (input: CategoryInput) =>
      category ? source.categories.update(category.id, input) : source.categories.create(input),
    success: category ? t.updated : t.created,
    onSuccess: close,
  });
  const remove = useAppMutation({
    mutationFn: (id: number) => source.categories.remove(id),
    success: t.deleted,
    onSuccess: close,
  });

  const onSubmit = handleSubmit((values) => save.mutate({ ...values, iconType: 'registry' }));

  async function handleDelete() {
    if (!category) return;
    const ok = await confirm({
      title: dictionary.common.confirm.deleteTitle(category.name),
      description: t.deleteDescription,
    });
    if (ok) remove.mutate(category.id);
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t.editTitle : t.newTitle}
      footer={(
        <FormActions
          formId={FORM_ID}
          submitLabel={category ? t.submitEdit : t.submitNew}
          pending={save.isPending}
          onCancel={close}
          onDelete={category ? handleDelete : undefined}
          deleting={remove.isPending}
        />
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FormStack>
          <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
            <IconBadge icon={icon} color={color} />
            <span className="truncate font-medium">{name || t.preview}</span>
          </div>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Segmented label={t.typeLabel} options={typeOptions} value={field.value ?? 'expense'} onChange={field.onChange} />
            )}
          />
          <Field label={dictionary.common.form.name} error={errors.name?.message}>
            {(id) => <Input id={id} placeholder={t.namePlaceholder} maxLength={100} aria-invalid={!!errors.name || undefined} {...register('name')} />}
          </Field>
          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">{t.color}</span>
            <Controller
              control={control}
              name="color"
              render={({ field }) => <ColorPicker label={t.colorLabel} value={field.value ?? '#0e7c86'} onChange={field.onChange} />}
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">{t.icon}</span>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} color={color} />}
            />
          </div>
        </FormStack>
      </form>
    </ResponsiveDialog>
  );
}
