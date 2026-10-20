import type { ReactNode } from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorText } from '@/data/mutations';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Pantalla vacía: explica qué falta y ofrece la acción para empezar. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="max-w-sm">
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useT();
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center', className)}>
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <div>
        <p className="font-medium">{t.common.states.loadErrorTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorText(error, t)}</p>
      </div>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t.common.actions.retry}</Button>}
    </div>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  const t = useT();
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label={t.common.states.loading}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
    </div>
  );
}
