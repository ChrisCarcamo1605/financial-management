import type { ReactNode } from 'react';
import { Brand } from '@/components/layout/brand';
import { LanguageSwitch } from '@/features/preferences/language-switch';
import { useT } from '@/features/preferences/preferences-provider';

/** Marco de las pantallas de acceso: formulario a la derecha, contexto del producto a la izquierda. */
export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const t = useT().shell.auth;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col">
        <Brand className="[&_rect]:fill-primary-foreground/15" />
        <div className="mt-auto max-w-md">
          <p className="text-4xl leading-tight font-semibold">{t.tagline}</p>
          <p className="mt-4 text-primary-foreground/80">
            {t.pitch}
          </p>
        </div>
        <svg viewBox="0 0 600 160" className="pointer-events-none absolute inset-x-0 top-1/3 w-full opacity-20" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M0 ${40 + i * 28} C 100 ${10 + i * 28}, 200 ${70 + i * 28}, 300 ${40 + i * 28} S 500 ${10 + i * 28}, 600 ${40 + i * 28}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          ))}
        </svg>
      </aside>
      <main className="relative flex items-center justify-center px-5 py-12">
        <LanguageSwitch className="absolute top-4 right-4" />
        <div className="w-full max-w-sm">
          <Brand className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
