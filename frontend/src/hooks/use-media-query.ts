import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Breakpoint md de Tailwind: a partir de aquí se usa layout de escritorio. */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 768px)');
}
