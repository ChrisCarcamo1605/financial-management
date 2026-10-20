import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPage, RegisterPage } from '@/features/auth/auth-form';
import { PublicOnly, RequireAuth } from '@/features/auth/guards';
import { QuickActionsProvider } from './quick-actions';

const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page'));
const TransactionsPage = lazy(() => import('@/features/transactions/transactions-page'));
const QuincenasPage = lazy(() => import('@/features/quincenas/quincenas-page'));
const AccountsPage = lazy(() => import('@/features/accounts/accounts-page'));
const BudgetsPage = lazy(() => import('@/features/budgets/budgets-page'));
const SavingsPage = lazy(() => import('@/features/savings/savings-page'));
const ServicesPage = lazy(() => import('@/features/services/services-page'));
const LoansPage = lazy(() => import('@/features/loans/loans-page'));
const IncomePage = lazy(() => import('@/features/income/income-page'));
const AnalyticsPage = lazy(() => import('@/features/analytics/analytics-page'));
const SettingsPage = lazy(() => import('@/features/settings/settings-page'));

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <QuickActionsProvider><AppShell /></QuickActionsProvider>,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/movimientos', element: <TransactionsPage /> },
          { path: '/quincenas', element: <QuincenasPage /> },
          { path: '/cuentas', element: <AccountsPage /> },
          { path: '/presupuestos', element: <BudgetsPage /> },
          { path: '/ahorro', element: <SavingsPage /> },
          { path: '/servicios', element: <ServicesPage /> },
          { path: '/prestamos', element: <LoansPage /> },
          { path: '/ingresos', element: <IncomePage /> },
          { path: '/analisis', element: <AnalyticsPage /> },
          { path: '/ajustes', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
