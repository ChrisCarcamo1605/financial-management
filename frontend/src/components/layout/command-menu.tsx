import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeftRight, Minus, Moon, Plus, Sun } from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { ALL_NAV_ITEMS } from '@/app/navigation';
import { useQuickActions } from '@/app/quick-actions';
import { usePreferences } from '@/features/preferences/preferences-provider';

interface CommandMenuProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

/** Buscador global (⌘K / Ctrl+K): navegar y ejecutar acciones frecuentes. */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate();
  const actions = useQuickActions();
  const { isDark, update, t: dictionary } = usePreferences();
  const { shell: t, common } = dictionary;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.command.title}
      description={t.command.description}
      className="max-sm:top-3 max-sm:translate-y-0 max-sm:max-h-[calc(100dvh-1.5rem)] [&_[cmdk-list]]:max-h-[min(60dvh,26rem)] max-sm:[&_[cmdk-list]]:max-h-[calc(100dvh-8rem)]"
    >
      <CommandInput placeholder={t.command.placeholder} />
      <CommandList>
        <CommandEmpty>{common.states.noResults}</CommandEmpty>
        <CommandGroup heading={t.command.actions}>
          <CommandItem onSelect={() => run(() => actions.newTransaction('expense'))} keywords={t.command.expenseKeywords}>
            <Minus /> {t.command.newExpense}
          </CommandItem>
          <CommandItem onSelect={() => run(() => actions.newTransaction('income'))} keywords={t.command.incomeKeywords}>
            <Plus /> {t.command.newIncome}
          </CommandItem>
          <CommandItem onSelect={() => run(() => actions.newTransfer())} keywords={t.command.transferKeywords}>
            <ArrowLeftRight /> {t.command.newTransfer}
          </CommandItem>
          <CommandItem onSelect={() => run(() => update({ theme: isDark ? 'light' : 'dark' }))} keywords={t.command.themeKeywords}>
            {isDark ? <Sun /> : <Moon />} {t.command.toggleTheme(isDark)}
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading={t.command.goTo}>
          {ALL_NAV_ITEMS.map((item) => (
            <CommandItem key={item.to} onSelect={() => run(() => navigate(item.to))} keywords={t.nav.keywords[item.id]}>
              <item.icon /> {t.nav.items[item.id]}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
