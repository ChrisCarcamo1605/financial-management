import { Link } from 'react-router';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/shared/section';
import { useAuth } from '@/features/auth/auth-provider';
import { useT } from '@/features/preferences/preferences-provider';

export function DashboardSection() {
  const t = useT().settings.dashboard;
  return (
    <Panel title={t.title} description={t.description}>
      <Button asChild variant="outline">
        <Link to="/?personalizar=1"><LayoutDashboard /> {t.customize}</Link>
      </Button>
    </Panel>
  );
}

export function AccountSection() {
  const t = useT().settings.account;
  const { user, logout } = useAuth();
  return (
    <Panel title={t.title}>
      <dl className="grid gap-1">
        <dt className="text-sm text-muted-foreground">{t.email}</dt>
        <dd className="truncate font-medium">{user?.email}</dd>
      </dl>
      <Button variant="outline" className="mt-5" onClick={() => logout()}><LogOut /> {t.logout}</Button>
    </Panel>
  );
}
