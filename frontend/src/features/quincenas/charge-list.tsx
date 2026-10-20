import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import type { CardCharge } from '@/data/types';
import { useFormat, useT } from '@/features/preferences/preferences-provider';

/** Cargos detrás de un monto de tarjeta: movimientos reales y servicios proyectados. */
export function ChargeList({ charges }: { charges: CardCharge[] }) {
  const fmt = useFormat();
  const t = useT().quincenas.card;
  if (charges.length === 0) return <p className="text-xs text-muted-foreground">{t.noCharges}</p>;
  return (
    <ul className="grid gap-1.5 rounded-md bg-muted/60 p-2.5">
      {charges.map((charge) => (
        <li key={charge.id} className="flex items-center gap-2 text-xs">
          <CategoryIcon icon={charge.icon} size={13} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{charge.name}</span>
          {charge.projected && <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">{t.projected}</Badge>}
          <span className="text-muted-foreground">{fmt.dayMonth(charge.date)}</span>
          <Money value={charge.amount} className="w-16 text-right font-medium" />
        </li>
      ))}
    </ul>
  );
}
