import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Segmented } from '@/components/shared/form';
import type { WidgetLayoutItem, WidgetSize } from '@/data/types';
import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useT } from '@/features/preferences/preferences-provider';
import { moveItem } from './layout';
import { WIDGETS_BY_ID } from './widgets/registry';

interface CustomizeSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  layout: WidgetLayoutItem[];
  onChange(layout: WidgetLayoutItem[]): void;
  onReset(): void;
}


/** Panel para elegir qué widgets ver, en qué orden (arrastrar o flechas) y su ancho. */
export function CustomizeSheet({ open, onOpenChange, layout, onChange, onReset }: CustomizeSheetProps) {
  const isDesktop = useIsDesktop();
  const { dashboard: { customizeSheet: t }, common } = useT();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = layout.map((item) => item.id);
    onChange(moveItem(layout, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  const patch = (id: string, change: Partial<WidgetLayoutItem>) =>
    onChange(layout.map((item) => (item.id === id ? { ...item, ...change } : item)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isDesktop ? 'right' : 'bottom'} className={cn('flex flex-col gap-0', isDesktop ? 'w-full sm:max-w-md' : 'max-h-[90dvh] rounded-t-xl')}>
        <SheetHeader className="border-b">
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layout.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ol className="grid gap-2">
                {layout.map((item, index) => (
                  <SortableWidgetRow
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === layout.length - 1}
                    onMove={(delta) => onChange(moveItem(layout, index, index + delta))}
                    onToggle={(visible) => patch(item.id, { visible })}
                    onResize={(size) => patch(item.id, { size })}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
        <SheetFooter className="flex-row justify-between border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" onClick={onReset}>{common.actions.reset}</Button>
          <Button onClick={() => onOpenChange(false)}>{common.actions.done}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface RowProps {
  item: WidgetLayoutItem;
  isFirst: boolean;
  isLast: boolean;
  onMove(delta: -1 | 1): void;
  onToggle(visible: boolean): void;
  onResize(size: WidgetSize): void;
}

function SortableWidgetRow({ item, isFirst, isLast, onMove, onToggle, onResize }: RowProps) {
  const widget = WIDGETS_BY_ID.get(item.id)!;
  const { dashboard } = useT();
  const t = dashboard.customizeSheet;
  const { title, description } = dashboard.widgets[widget.id];
  const sizeOptions = [
    { value: 'half' as const, label: t.half },
    { value: 'full' as const, label: t.full },
  ];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const switchId = `widget-${item.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('grid gap-3 rounded-lg border bg-card p-3', isDragging && 'relative z-10 shadow-lg', !item.visible && 'bg-muted/50')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          aria-label={t.reorder(title)}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
          <span className={cn('block text-sm font-medium', !item.visible && 'text-muted-foreground')}>{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </label>
        <Switch id={switchId} checked={item.visible} onCheckedChange={onToggle} />
      </div>
      <div className="flex items-center gap-2 pl-8">
        {!widget.fullOnly && (
          <Segmented label={t.widthLabel(title)} size="sm" className="h-8 w-44" options={sizeOptions} value={item.size} onChange={onResize} />
        )}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon-sm" disabled={isFirst} onClick={() => onMove(-1)} aria-label={t.moveUp(title)}><ChevronUp /></Button>
          <Button variant="ghost" size="icon-sm" disabled={isLast} onClick={() => onMove(1)} aria-label={t.moveDown(title)}><ChevronDown /></Button>
        </div>
      </div>
    </li>
  );
}
