import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/shared/page-header';
import type { WidgetLayoutItem } from '@/data/types';
import { useAuth } from '@/features/auth/auth-provider';
import { useFormat, usePreferences } from '@/features/preferences/preferences-provider';
import { cn } from '@/lib/utils';
import { CustomizeSheet } from './customize-sheet';
import { resolveLayout } from './layout';
import { WIDGETS, WIDGETS_BY_ID } from './widgets/registry';

export default function DashboardPage() {
  const fmt = useFormat();
  const { user } = useAuth();
  const { preferences, update, t: { dashboard: t, common } } = usePreferences();
  const [params, setParams] = useSearchParams();
  const customizing = params.get('personalizar') === '1';

  const layout = useMemo(() => resolveLayout(preferences.dashboard_layout, WIDGETS), [preferences.dashboard_layout]);
  const visible = layout.filter((item) => item.visible);

  const setCustomizing = (open: boolean) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (open) next.set('personalizar', '1');
    else next.delete('personalizar');
    return next;
  }, { replace: true });

  const saveLayout = (next: WidgetLayoutItem[]) => update({ dashboard_layout: next });
  const name = user?.email.split('@')[0];

  return (
    <Page>
      <PageHeader
        title={t.greeting(new Date().getHours())}
        description={<span className="first-letter:uppercase">{fmt.date(new Date(), common.dates.longWeekday)}{name ? `, ${name}` : ''}</span>}
        actions={(
          <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>
            <SlidersHorizontal /> {t.customize}
          </Button>
        )}
      />

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t.empty.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.empty.description}</p>
          <Button className="mt-4" onClick={() => setCustomizing(true)}>{t.empty.action}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((item) => {
            const widget = WIDGETS_BY_ID.get(item.id)!;
            const full = widget.fullOnly || item.size === 'full';
            return (
              <div key={item.id} className={cn('min-w-0', full && 'md:col-span-2')}>
                <widget.Component />
              </div>
            );
          })}
        </div>
      )}

      <CustomizeSheet
        open={customizing}
        onOpenChange={setCustomizing}
        layout={layout}
        onChange={saveLayout}
        onReset={() => update({ dashboard_layout: null })}
      />
    </Page>
  );
}
