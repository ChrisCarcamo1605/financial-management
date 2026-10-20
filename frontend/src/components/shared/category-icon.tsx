import { resolveIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  icon: string | null | undefined;
  className?: string;
  size?: number;
}

/** Icono guardado en la base de datos (clave del registro, emoji o SVG). */
export function CategoryIcon({ icon, className, size = 16 }: CategoryIconProps) {
  const resolved = resolveIcon(icon);
  if (resolved.kind === 'emoji') {
    return <span className={cn('leading-none', className)} style={{ fontSize: size }} aria-hidden>{resolved.text}</span>;
  }
  if (resolved.kind === 'svg') {
    // Como máscara: hereda el color del texto (currentColor) sin inyectar HTML.
    const mask = `url("${resolved.src}") center / contain no-repeat`;
    return <span aria-hidden className={cn('inline-block shrink-0 bg-current', className)} style={{ width: size, height: size, mask, WebkitMask: mask }} />;
  }
  const { Icon } = resolved;
  return <Icon size={size} className={className} aria-hidden strokeWidth={1.9} />;
}

interface IconBadgeProps extends CategoryIconProps {
  /** Color de la categoría; por defecto el acento. */
  color?: string | null;
  badgeSize?: 'sm' | 'md' | 'lg';
}

const BADGE_SIZES = { sm: 'size-7', md: 'size-9', lg: 'size-11' } as const;
const ICON_SIZES = { sm: 14, md: 17, lg: 20 } as const;

/** Icono sobre un fondo teñido con el color de su categoría. */
export function IconBadge({ icon, color, badgeSize = 'md', className }: IconBadgeProps) {
  const tint = color || 'var(--accent-brand)';
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-md', BADGE_SIZES[badgeSize], className)}
      style={{ color: tint, backgroundColor: `color-mix(in oklab, ${tint} 14%, transparent)` }}
    >
      <CategoryIcon icon={icon} size={ICON_SIZES[badgeSize]} />
    </span>
  );
}
