import type { WidgetLayoutItem, WidgetSize } from '@/data/types';

export interface WidgetDefinitionMeta {
  id: string;
  defaultSize: WidgetSize;
  defaultVisible: boolean;
}

/**
 * Combina el layout guardado con los widgets disponibles: respeta el orden,
 * visibilidad y tamaño guardados, descarta widgets que ya no existen y añade
 * al final los nuevos con su configuración por defecto.
 */
export function resolveLayout(saved: WidgetLayoutItem[] | null | undefined, registry: WidgetDefinitionMeta[]): WidgetLayoutItem[] {
  const known = new Map(registry.map((w) => [w.id, w]));
  const result: WidgetLayoutItem[] = [];
  const seen = new Set<string>();
  for (const item of saved ?? []) {
    if (!known.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push({ id: item.id, visible: item.visible, size: item.size });
  }
  for (const widget of registry) {
    if (!seen.has(widget.id)) result.push({ id: widget.id, visible: widget.defaultVisible, size: widget.defaultSize });
  }
  return result;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
