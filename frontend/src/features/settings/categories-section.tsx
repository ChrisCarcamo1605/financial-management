import { useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/shared/category-icon';
import { Segmented } from '@/components/shared/form';
import { Panel } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useCategories } from '@/data/queries';
import type { Category, TxType } from '@/data/types';
import { CategoryForm } from '@/features/categories/category-form';
import { useT } from '@/features/preferences/preferences-provider';

export function CategoriesSection() {
  const t = useT().settings.categories;
  const typeOptions = [
    { value: 'expense' as const, label: t.expenses },
    { value: 'income' as const, label: t.incomes },
  ];
  const categories = useCategories();
  const [type, setType] = useState<TxType>('expense');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const openForm = (category: Category | null) => {
    setEditing(category);
    setFormOpen(true);
  };
  const visible = (categories.data ?? []).filter((c) => c.type === type);

  return (
    <Panel
      title={t.title}
      description={t.description}
      actions={<Button size="sm" onClick={() => openForm(null)}><Plus /> {t.new}</Button>}
    >
      <div className="grid gap-4">
        <Segmented label={t.typeLabel} options={typeOptions} value={type} onChange={(next: TxType) => setType(next)} className="sm:w-72" />
        {categories.isPending ? <ListSkeleton rows={4} /> : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t.emptyTitle(type)}
            description={t.emptyDescription}
            action={<Button size="sm" onClick={() => openForm(null)}><Plus /> {t.newLong}</Button>}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => openForm(category)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-md border p-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={t.edit(category.name)}
                >
                  <IconBadge icon={category.icon} color={category.color} badgeSize="sm" />
                  <span className="truncate text-sm">{category.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <CategoryForm open={formOpen} onOpenChange={setFormOpen} category={editing} defaultType={type} />
    </Panel>
  );
}
