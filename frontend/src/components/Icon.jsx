import { LuCircleDot } from 'react-icons/lu';
import { ICON_MAP, BI_ALIAS } from '../lib/icons';

/**
 * Renders an icon from the database.
 *
 * Resolution order:
 *   1. icon is a key in ICON_MAP  → Lucide component
 *   2. icon starts with 'bi-'     → map via BI_ALIAS → Lucide component
 *   3. icon looks like an emoji   → render as text span
 *   4. fallback                   → LuCircleDot
 */
export default function Icon({ icon, size = 16, style, className }) {
  if (!icon) return <LuCircleDot size={size} style={style} className={className} />;

  const str = String(icon).trim();

  // 1 — Direct key match
  if (ICON_MAP[str]) {
    const Comp = ICON_MAP[str];
    return <Comp size={size} style={style} className={className} />;
  }

  // 2 — Bootstrap alias
  if (str.startsWith('bi-')) {
    const key = BI_ALIAS[str];
    const Comp = key ? ICON_MAP[key] : null;
    if (Comp) return <Comp size={size} style={style} className={className} />;
    return <LuCircleDot size={size} style={style} className={className} />;
  }

  // 3 — Raw SVG markup
  if (str.startsWith('<')) {
    return (
      <span
        style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}
        className={className}
        dangerouslySetInnerHTML={{ __html: str }}
      />
    );
  }

  // 4 — Emoji / text (single grapheme clusters: emojis, symbols, etc.)
  // Any non-ASCII string that isn't bi-* is treated as emoji/text
  if (!/^[a-z0-9_-]+$/.test(str)) {
    return (
      <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', flexShrink: 0, ...style }} className={className}>
        {str}
      </span>
    );
  }

  // 5 — Fallback
  return <LuCircleDot size={size} style={style} className={className} />;
}
