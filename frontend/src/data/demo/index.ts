import { detectLanguage } from '@/i18n';
import type { DataSource } from '../source';
import { createDemoSource } from './demo-source';
import { createDemoSeed } from './seed';
import { createDemoStore } from './store';

export interface DemoControls {
  /** Vuelve a los datos de ejemplo. */
  reset(): void;
}

/** Modo demo: todo corre en el navegador, sin API ni base de datos. */
export function createDemo(): { source: DataSource; controls: DemoControls } {
  const store = createDemoStore(() => createDemoSeed(new Date(), detectLanguage()));
  return { source: createDemoSource(store), controls: { reset: () => store.reset() } };
}
