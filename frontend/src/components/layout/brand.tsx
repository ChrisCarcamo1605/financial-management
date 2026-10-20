import { cn } from '@/lib/utils';

/** Marca de Caudal: dos corrientes sobre el acento. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent-brand)" />
      <path
        d="M6 13c3.3-3 6.7 3 10 0s6.7-3 10 0M6 20c3.3-3 6.7 3 10 0s6.7-3 10 0"
        fill="none"
        stroke="var(--accent-brand-fg)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="text-lg font-semibold tracking-tight">Caudal</span>
    </span>
  );
}
