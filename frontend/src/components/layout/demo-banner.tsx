import { FlaskConical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/shared/confirm';
import { useDemoMode } from '@/app/demo-mode';
import { useT } from '@/features/preferences/preferences-provider';

/** Aviso permanente del modo demo con opción de volver a los datos de ejemplo. */
export function DemoBanner() {
  const demo = useDemoMode();
  const confirm = useConfirm();
  const t = useT().shell.demo;
  if (!demo) return null;

  async function reset() {
    const ok = await confirm({ title: t.resetTitle, description: t.resetDescription, confirmLabel: t.resetConfirm });
    if (!ok) return;
    demo!.reset();
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3 border-b bg-accent px-4 py-2 text-sm md:px-8">
      <FlaskConical className="size-4 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium">{t.badge}.</span>{' '}
        <span className="text-muted-foreground max-sm:hidden">{t.description}</span>
      </p>
      <Button variant="outline" size="xs" onClick={reset}><RotateCcw /> {t.reset}</Button>
    </div>
  );
}
