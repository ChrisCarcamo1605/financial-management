import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ArrowLeftRight, Ellipsis, Minus, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ALL_NAV_ITEMS, MOBILE_PRIMARY, NAV_GROUPS, SETTINGS_ITEM, type NavItem } from '@/app/navigation';
import { useQuickActions } from '@/app/quick-actions';
import { ListSkeleton } from '@/components/shared/states';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';
import { Brand } from './brand';
import { CommandMenu } from './command-menu';
import { UserMenu } from './user-menu';

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const t = useT();
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) => cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        isActive && 'bg-accent font-medium text-foreground [&>svg]:text-primary',
      )}
    >
      <item.icon className="size-[18px] shrink-0" aria-hidden />
      {t.shell.nav.items[item.id]}
    </NavLink>
  );
}

function NavSections({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label ?? 'main'} className="grid gap-0.5">
          {group.label && <p className="px-3 pt-4 pb-1 text-xs text-muted-foreground">{t.shell.nav.groups[group.label]}</p>}
          {group.items.map((item) => <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />)}
        </div>
      ))}
    </>
  );
}

function QuickAddMenu({ className }: { className?: string }) {
  const actions = useQuickActions();
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className}><Plus /> {t.shell.topbar.quickAdd}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => actions.newTransaction('expense')}><Minus /> {t.shell.topbar.expense}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.newTransaction('income')}><Plus /> {t.shell.topbar.income}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.newTransfer()}><ArrowLeftRight /> {t.shell.topbar.transfer}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileTabBar({ onMore }: { onMore(): void }) {
  const actions = useQuickActions();
  const t = useT();
  const location = useLocation();
  const primary = ALL_NAV_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.to));
  const moreActive = !MOBILE_PRIMARY.includes(location.pathname);
  const tabClass = (active: boolean) => cn(
    'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground',
    active && 'text-primary',
  );

  return (
    <nav
      aria-label={t.shell.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex items-stretch">
        {primary.slice(0, 2).map((item) => (
          <NavLink key={item.to} to={item.to} end className={({ isActive }) => tabClass(isActive)}>
            <item.icon className="size-5" aria-hidden />{t.shell.nav.items[item.id]}
          </NavLink>
        ))}
        <div className="flex flex-1 items-center justify-center">
          <Button size="icon-lg" className="-mt-5 size-13 rounded-full shadow-lg" onClick={() => actions.newTransaction('expense')} aria-label={t.shell.topbar.newTransaction}>
            <Plus className="size-6" />
          </Button>
        </div>
        {primary.slice(2).map((item) => (
          <NavLink key={item.to} to={item.to} end className={({ isActive }) => tabClass(isActive)}>
            <item.icon className="size-5" aria-hidden />{t.shell.nav.items[item.id]}
          </NavLink>
        ))}
        <button type="button" className={tabClass(moreActive)} onClick={onMore}>
          <Ellipsis className="size-5" aria-hidden />{t.shell.nav.more}
        </button>
      </div>
    </nav>
  );
}

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const t = useT();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        {t.shell.nav.skipToContent}
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar md:flex">
        <div className="px-5 pt-5 pb-3"><Brand /></div>
        <nav aria-label={t.shell.nav.main} className="flex-1 overflow-y-auto px-3">
          <NavSections />
        </nav>
        <div className="grid gap-1 border-t p-3">
          <SidebarLink item={SETTINGS_ITEM} />
          <UserMenu className="w-full" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <Brand className="md:hidden" />
          <Button
            variant="outline"
            className="ml-auto h-9 justify-start gap-2 text-muted-foreground md:ml-0 md:w-72"
            onClick={() => setCommandOpen(true)}
            aria-label={t.shell.topbar.search}
          >
            <Search />
            <span className="hidden md:inline">{t.shell.topbar.searchPlaceholder}</span>
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[11px] md:inline">Ctrl K</kbd>
          </Button>
          <QuickAddMenu className="ml-auto hidden md:inline-flex" />
          <UserMenu compact className="md:hidden" />
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12">
          <Suspense fallback={<ListSkeleton rows={6} />}>
            <Outlet key={location.pathname} />
          </Suspense>
        </main>
      </div>

      <MobileTabBar onMore={() => setMoreOpen(true)} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>{t.shell.nav.allSections}</SheetTitle>
            <SheetDescription className="sr-only">{t.shell.nav.allSectionsDescription}</SheetDescription>
          </SheetHeader>
          <nav aria-label={t.shell.nav.allSections} className="grid gap-0.5 px-2">
            <NavSections onNavigate={() => setMoreOpen(false)} />
            <div className="mt-3 border-t pt-3"><SidebarLink item={SETTINGS_ITEM} onNavigate={() => setMoreOpen(false)} /></div>
          </nav>
        </SheetContent>
      </Sheet>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
