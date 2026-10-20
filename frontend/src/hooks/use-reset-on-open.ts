import { useEffect, useEffectEvent } from 'react';
import type { FieldValues, UseFormReset } from 'react-hook-form';

/**
 * Reinicia un formulario cada vez que su diálogo se abre, con los valores
 * del elemento a editar (o los de uno nuevo). Mantiene el diálogo montado
 * para que la animación de cierre no se corte.
 */
export function useResetOnOpen<T extends FieldValues>(open: boolean, reset: UseFormReset<T>, values: () => T) {
  const readValues = useEffectEvent(values);
  useEffect(() => {
    if (open) reset(readValues());
  }, [open, reset]);
}
