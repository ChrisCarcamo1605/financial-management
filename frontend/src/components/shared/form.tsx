import { useId, type ReactNode } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';

interface FieldProps {
  label: ReactNode;
  /** id del control; si se omite se genera uno y se pasa a children como función. */
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode | ((id: string) => ReactNode);
}

/** Etiqueta + control + ayuda/error, con los atributos aria conectados. */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  const generated = useId();
  const id = htmlFor ?? generated;
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {typeof children === 'function' ? children(id) : children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

export function FormStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 py-1', className)}>{children}</div>;
}

/** Input numérico para montos: teclado decimal en móvil y cifras tabulares. */
export function AmountInput(props: React.ComponentProps<typeof Input>) {
  return <Input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" {...props} className={cn('tabular', props.className)} />;
}

export interface Option<T extends string = string> {
  value: T;
  label: ReactNode;
}

interface SelectFieldProps<T extends string> {
  id?: string;
  value: T | '' | null | undefined;
  onChange(value: T): void;
  options: Option<T>[];
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

export function SelectInput<T extends string>({
  id, value, onChange, options, placeholder, invalid, className,
}: SelectFieldProps<T>) {
  const t = useT();
  return (
    <Select value={value || undefined} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger id={id} className={cn('w-full', className)} aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder ?? t.common.form.selectPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange(value: T): void;
  options: Option<T>[];
  label: string;
  className?: string;
  size?: 'sm' | 'default';
}

/** Selector de una opción entre pocas (2-4), siempre con una seleccionada. */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'default' }: SegmentedProps<T>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      className={cn('w-full', className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

interface FormActionsProps {
  formId: string;
  submitLabel: string;
  pending?: boolean;
  onCancel(): void;
  /** Si se pasa, muestra el botón Eliminar a la izquierda. */
  onDelete?: () => void;
  deleting?: boolean;
}

/** Botonera estándar de un formulario en diálogo. */
export function FormActions({ formId, submitLabel, pending, onCancel, onDelete, deleting }: FormActionsProps) {
  const t = useT();
  return (
    <>
      {onDelete && (
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive sm:mr-auto" onClick={onDelete} disabled={deleting}>
          <Trash2 /> {t.common.actions.delete}
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onCancel} className="max-sm:hidden">{t.common.actions.cancel}</Button>
      <Button type="submit" form={formId} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </>
  );
}
