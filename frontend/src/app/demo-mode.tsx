import { createContext, useContext, type ReactNode } from 'react';
import type { DemoControls } from '@/data/demo';

const DemoModeContext = createContext<DemoControls | null>(null);

export function DemoModeProvider({ demo, children }: { demo?: DemoControls; children: ReactNode }) {
  return <DemoModeContext.Provider value={demo ?? null}>{children}</DemoModeContext.Provider>;
}

/** Controles del modo demo, o null cuando la app usa la API real. */
export function useDemoMode() {
  return useContext(DemoModeContext);
}
