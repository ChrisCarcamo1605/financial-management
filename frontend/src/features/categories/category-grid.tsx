import { IconBadge } from '@/components/shared/category-icon';
import type { Category } from '@/data/types';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';

interface CategoryGridProps {
  categories: Category[];
  value: number | undefined;
  onChange(id: number): void;
  invalid?: boolean;
  labelledBy?: string;
}

/** Selección de categoría por iconos: más rápida que un desplegable al registrar. */
export function CategoryGrid({ categories, value, onChange, invalid, labelledBy }: CategoryGridProps) {
  const t = useT();
  if (categories.length === 0) {
    return <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{t.categories.gridEmpty}</p>;
  }
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      className={cn('grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto rounded-md p-0.5 sm:grid-cols-4', invalid && 'ring-1 ring-destructive')}
    >
      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected && 'border-primary bg-accent font-medium',
            )}
          >
            <IconBadge icon={category.icon} color={category.color} badgeSize="sm" />
            <span className="w-full truncate text-center">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
