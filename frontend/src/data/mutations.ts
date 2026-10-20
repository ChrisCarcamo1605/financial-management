import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/features/preferences/preferences-provider';
import type { Dictionary } from '@/i18n';
import { ApiError } from './http/client';
import { queryKeys } from './query-keys';

interface AppMutationOptions<TVars, TResult> {
  mutationFn: (vars: TVars) => Promise<TResult>;
  /** Mensaje de éxito; string fijo o derivado del resultado. */
  success?: string | ((result: TResult, vars: TVars) => string);
  onSuccess?: (result: TResult, vars: TVars) => void;
}

/** Mensaje legible de un error: el del servidor, o uno traducido si no hubo conexión. */
export function errorText(error: unknown, t: Dictionary, fallback = t.common.states.genericError) {
  if (error instanceof ApiError && error.status === 0) return t.common.states.networkError;
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Mutación estándar: casi cualquier cambio financiero (un gasto, una transferencia,
 * una cuota) altera saldos, presupuestos y quincenas a la vez, así que se invalida
 * todo salvo las preferencias. Muestra un toast con el resultado.
 */
export function useAppMutation<TVars = void, TResult = unknown>({
  mutationFn, success, onSuccess,
}: AppMutationOptions<TVars, TResult>) {
  const queryClient = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn,
    onSuccess: async (result, vars) => {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== queryKeys.preferences[0],
      });
      if (success) toast.success(typeof success === 'function' ? success(result, vars) : success);
      onSuccess?.(result, vars);
    },
    onError: (error) => toast.error(errorText(error, t)),
  });
}
