import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmProvider } from '@/components/shared/confirm';
import { DataSourceProvider } from '@/data/provider';
import type { DataSource } from '@/data/source';
import { ApiError } from '@/data/http/client';
import { AuthProvider } from '@/features/auth/auth-provider';
import { PreferencesProvider, usePreferences } from '@/features/preferences/preferences-provider';
import { router } from './router';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // No reintentar errores del cliente (401/404/400): no van a cambiar.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}

function ThemedToaster() {
  const { isDark } = usePreferences();
  return <Toaster theme={isDark ? 'dark' : 'light'} position="bottom-right" richColors closeButton offset={{ bottom: 88 }} mobileOffset={{ bottom: 88 }} />;
}

export function App({ source }: { source: DataSource }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <DataSourceProvider source={source}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <TooltipProvider delayDuration={300}>
              <ConfirmProvider>
                <RouterProvider router={router} />
                <ThemedToaster />
              </ConfirmProvider>
            </TooltipProvider>
          </PreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </DataSourceProvider>
  );
}
