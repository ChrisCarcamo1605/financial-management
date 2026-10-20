import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/states';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';

interface WidgetCardProps {
  title: string;
  /** Enlace a la sección completa. */
  to?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}

export function WidgetCard({ title, to, linkLabel, children, className }: WidgetCardProps) {
  const t = useT();
  return (
    <section className={cn('flex h-full flex-col rounded-lg border bg-card p-4 md:p-5', className)} aria-label={title}>
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {to && (
          <Link to={to} className="flex items-center gap-0.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {linkLabel ?? t.common.actions.seeAll}<ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

/** Estado de carga/error común para el cuerpo de un widget. */
export function WidgetBody({ query, children, rows = 3 }: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  children: () => ReactNode;
  rows?: number;
}) {
  if (query.isPending) {
    return <div className="grid gap-2">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>;
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0 py-4" />;
  return <>{children()}</>;
}

export function WidgetEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
