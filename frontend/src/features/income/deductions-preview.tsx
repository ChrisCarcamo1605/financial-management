import { useQuery } from '@tanstack/react-query';
import { Money } from '@/components/shared/money';
import { useDataSource } from '@/data/provider';
import { queryKeys } from '@/data/query-keys';
import type { Modality, PaySchedule } from '@/data/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useT } from '@/features/preferences/preferences-provider';

interface DeductionsPreviewProps {
  gross: number;
  modality: Modality;
  schedule: PaySchedule;
}

/** Desglose en vivo de ISSS, AFP e ISR calculado por la API mientras se escribe el bruto. */
export function DeductionsPreview({ gross, modality, schedule }: DeductionsPreviewProps) {
  const source = useDataSource();
  const t = useT().income.deductions;
  const debouncedGross = useDebouncedValue(gross);
  const valid = Number.isFinite(debouncedGross) && debouncedGross > 0;
  const preview = useQuery({
    queryKey: queryKeys.deductions(debouncedGross, modality),
    queryFn: () => source.incomeSources.preview(debouncedGross, modality),
    enabled: valid,
    staleTime: Infinity,
  });

  if (!valid) return null;
  const data = preview.data;
  const rows = data ? [
    { label: 'ISSS', value: data.isss },
    { label: 'AFP', value: data.afp },
    { label: t.tax, value: data.isr },
  ] : [];

  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm" aria-live="polite">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t.grossMonthly}</span>
        <Money value={debouncedGross} />
      </div>
      {preview.isPending ? (
        <p className="mt-2 text-muted-foreground">{t.calculating}</p>
      ) : preview.isError ? (
        <p className="mt-2 text-destructive">{t.error}</p>
      ) : data && (
        <>
          {rows.map((row) => (
            <div key={row.label} className="mt-1 flex justify-between">
              <span className="text-muted-foreground">{row.label}</span>
              <Money value={-row.value} signed tone={row.value > 0 ? 'outflow' : 'muted'} />
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
            <span>{t.netMonthly}</span>
            <Money value={data.net} tone="inflow" />
          </div>
          {schedule === 'biweekly' && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>{t.perQuincena}</span>
              <Money value={data.net / 2} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
