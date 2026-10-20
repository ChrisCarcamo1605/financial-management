import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './styles/index.css';
import { App } from './app/app';
import { createHttpSource } from './data/http/http-source';
import type { DataSource } from './data/source';
import type { DemoControls } from './data/demo';

/** El modo demo se carga como chunk aparte: el build normal no lo incluye. */
async function resolveSource(): Promise<{ source: DataSource; demo?: DemoControls }> {
  if (import.meta.env.VITE_DATA_SOURCE === 'demo') {
    const { createDemo } = await import('./data/demo');
    const { source, controls } = createDemo();
    return { source, demo: controls };
  }
  return { source: createHttpSource(import.meta.env.VITE_API_URL ?? '') };
}

const { source, demo } = await resolveSource();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App source={source} demo={demo} />
  </StrictMode>,
);
