import { Link } from 'react-router';
import { LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import type { ThemeMode } from '@/data/types';
import { cn } from '@/lib/utils';

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

/** Menú de cuenta: tema rápido, ajustes y cerrar sesión. */
export function UserMenu({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { user, logout } = useAuth();
  const { preferences, update, t: { shell: { userMenu: t } } } = usePreferences();
  const email = user?.email ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn('h-auto justify-start gap-2.5 px-2 py-1.5', className)} aria-label={t.label}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
            {initials(email)}
          </span>
          {!compact && <span className="min-w-0 truncate text-sm font-normal">{email}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preferences.theme} onValueChange={(theme) => update({ theme: theme as ThemeMode })}>
          <DropdownMenuRadioItem value="light"><Sun /> {t.light}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon /> {t.dark}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor /> {t.system}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/ajustes"><Settings /> {t.settings}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => logout()}>
          <LogOut /> {t.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
