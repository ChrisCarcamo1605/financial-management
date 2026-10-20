# Caudal · frontend

React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui (Radix) + TanStack Query.

```bash
pnpm install
pnpm dev          # http://localhost:3000 (proxy /api → :5000)
pnpm test         # vitest: lógica de fechas, quincenas y layout del dashboard
pnpm typecheck && pnpm lint
pnpm build
```

## Arquitectura

```
src/
  app/            providers, router, navegación, acciones rápidas globales
  data/           contrato de datos (types.ts), puerto DataSource (source.ts),
                  implementación HTTP (http/), hooks de lectura y mutaciones
  features/<x>/   una carpeta por dominio: página, formularios y lógica propia
  components/ui   primitivas shadcn (generadas, no editar a mano salvo ajustes)
  components/shared, charts, layout   piezas reutilizables de la app
  lib/            fechas, formato, iconos, utilidades puras
  styles/         tokens de diseño (CSS variables)
```

- **La UI nunca llama a `fetch`**: usa `useDataSource()`. `createHttpSource` habla con la API
  Flask; el modo demo implementará el mismo `DataSource` en el navegador.
- **Mutaciones** con `useAppMutation`: toast de resultado e invalidación de todo lo
  financiero (un gasto afecta saldos, presupuestos y quincenas a la vez).
- **Sesión**: access token solo en memoria, refresh en cookie httponly; al recargar se
  restaura con `/api/auth/refresh`.
- **Formularios**: zod + react-hook-form dentro de `ResponsiveDialog` (diálogo en escritorio,
  hoja inferior en móvil), con `FormActions` y `useResetOnOpen`.
- **Personalización**: apariencia (tema, acento, densidad, esquinas, tipografía), formato
  regional y layout del inicio se guardan en `/api/preferences` y se aplican vía CSS variables.

## Colores de datos

Los tokens `--viz-*` (entradas, salidas, tarjeta, préstamo, ahorro) están validados como
paleta categórica para daltonismo en claro y oscuro. Las entradas son azul, no verde: el par
verde/rojo no se distingue con deuteranopía.
