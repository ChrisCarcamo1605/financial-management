import { useSearchParams } from 'react-router';
import { CircleUser, Globe, LayoutDashboard, Palette, Tags, type LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageHeader } from '@/components/shared/page-header';
import { useIsDesktop } from '@/hooks/use-media-query';
import type { Dictionary } from '@/i18n';
import { useT } from '@/features/preferences/preferences-provider';
import { AppearanceSection } from './appearance-section';
import { CategoriesSection } from './categories-section';
import { AccountSection, DashboardSection } from './misc-sections';
import { RegionalSection } from './regional-section';

interface SettingsTab {
  /** Valor del parámetro ?seccion= (se mantiene en español para no romper enlaces). */
  id: string;
  label: keyof Dictionary['settings']['tabs'];
  icon: LucideIcon;
  render(): React.ReactNode;
}

const TABS: SettingsTab[] = [
  { id: 'apariencia', label: 'appearance', icon: Palette, render: () => <AppearanceSection /> },
  { id: 'regional', label: 'regional', icon: Globe, render: () => <RegionalSection /> },
  { id: 'categorias', label: 'categories', icon: Tags, render: () => <CategoriesSection /> },
  { id: 'inicio', label: 'dashboard', icon: LayoutDashboard, render: () => <DashboardSection /> },
  { id: 'cuenta', label: 'account', icon: CircleUser, render: () => <AccountSection /> },
];

export default function SettingsPage() {
  const t = useT().settings;
  const isDesktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const requested = params.get('seccion');
  const active = TABS.some((tab) => tab.id === requested) ? requested! : TABS[0].id;

  return (
    <Page>
      <PageHeader title={t.title} description={t.description} />
      <Tabs
        value={active}
        onValueChange={(seccion) => setParams({ seccion }, { replace: true })}
        orientation={isDesktop ? 'vertical' : 'horizontal'}
        className="gap-6 md:flex-row"
      >
        <TabsList
          variant="line"
          className="grid w-full grid-cols-2 gap-1 group-data-[orientation=horizontal]/tabs:h-auto sm:grid-cols-3 md:sticky md:top-20 md:flex md:w-52 md:shrink-0 md:items-stretch"
        >
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="h-9 flex-none justify-start md:h-auto md:px-3 md:py-2">
              <tab.icon aria-hidden /> {t.tabs[tab.label]}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="min-w-0">
            {tab.render()}
          </TabsContent>
        ))}
      </Tabs>
    </Page>
  );
}
