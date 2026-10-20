import { useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { cn } from '@/lib/utils';

export type CommitmentTone = 'inflow' | 'outflow' | 'card' | 'loan' | 'saving';

const TONE_STYLES: Record<CommitmentTone, string> = {
  inflow: 'text-inflow bg-inflow/12',
  outflow: 'text-outflow bg-outflow/12',
  card: 'text-card-debt bg-card-debt/12',
  loan: 'text-loan bg-loan/12',
  saving: 'text-saving bg-saving/12',
};

interface CommitmentRowProps {
  icon: string | null;
  tone: CommitmentTone;
  title: ReactNode;
  subtitle?: ReactNode;
  amount: number;
  /** Monto con signo + (entradas). */
  positive?: boolean;
  /** Estado pagado/pendiente: el texto siempre acompaña al color. */
  status?: { done: boolean; label: string };
  action?: ReactNode;
  /** Contenido desplegable (p. ej. cargos de una tarjeta). */
  details?: ReactNode;
  muted?: boolean;
}

/** Fila de un compromiso de la quincena: ingreso, servicio, cuota, tarjeta o ahorro. */
export function CommitmentRow({ icon, tone, title, subtitle, amount, positive, status, action, details, muted }: CommitmentRowProps) {
  const [open, setOpen] = useState(false);
  const body = (
    <>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', TONE_STYLES[tone])}>
        <CategoryIcon icon={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1 text-sm font-medium">
          <span className="truncate">{title}</span>
          {details && <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />}
        </span>
        {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Money value={positive ? amount : -amount} signed tone={positive ? 'inflow' : 'neutral'} className="text-sm font-medium" />
        {status && (
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[11px] font-normal', status.done ? 'border-transparent bg-accent text-foreground' : 'text-muted-foreground')}>
            {status.done && <Check className="size-3" aria-hidden />}
            {status.label}
          </Badge>
        )}
      </span>
    </>
  );

  return (
    <li className={cn('px-4 py-2.5 md:px-5', muted && 'opacity-70')}>
      {details ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {body}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-12">{details}</CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex items-center gap-3">{body}</div>
      )}
      {action && <div className="mt-2 pl-12">{action}</div>}
    </li>
  );
}
