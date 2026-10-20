import { useFormat } from '@/features/preferences/preferences-provider';
import type { MoneyOptions } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'auto' | 'inflow' | 'outflow' | 'muted';

interface MoneyProps extends MoneyOptions {
  value: number | null | undefined;
  /** 'auto' colorea según el signo. */
  tone?: Tone;
  className?: string;
}

const TONES: Record<Exclude<Tone, 'auto'>, string> = {
  neutral: '',
  inflow: 'text-inflow',
  outflow: 'text-outflow',
  muted: 'text-muted-foreground',
};

export function Money({ value, tone = 'neutral', className, ...options }: MoneyProps) {
  const fmt = useFormat();
  const amount = Number(value ?? 0);
  const resolved = tone === 'auto' ? (amount < 0 ? 'outflow' : amount > 0 ? 'inflow' : 'neutral') : tone;
  return <span className={cn('tabular whitespace-nowrap', TONES[resolved], className)}>{fmt.money(amount, options)}</span>;
}
