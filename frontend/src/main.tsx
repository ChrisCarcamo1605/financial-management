import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './styles/index.css';
import { App } from './app/app';
import { createHttpSource } from './data/http/http-source';

const source = createHttpSource(import.meta.env.VITE_API_URL ?? '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App source={source} />
  </StrictMode>,
);
