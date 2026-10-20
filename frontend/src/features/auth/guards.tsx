import { Navigate, Outlet, useLocation } from 'react-router';
import { BrandMark } from '@/components/layout/brand';
import { useT } from '@/features/preferences/preferences-provider';
import { useAuth } from './auth-provider';

function Splash() {
  const t = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label={t.common.states.loading}>
      <BrandMark className="size-10 animate-pulse" />
    </div>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}
