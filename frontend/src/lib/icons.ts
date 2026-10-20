import {
  Baby, Banknote, BookOpen, Briefcase, Bus, Camera, Car, CircleDot, Clapperboard, Coffee, CreditCard, Dog,
  Droplets, Dumbbell, Flame, Fuel, Gamepad2, Gift, GraduationCap, Hammer, HeartPulse, House, Landmark,
  Laptop, Monitor, Music, Pill, PiggyBank, Plane, Receipt, Repeat, Scissors, Settings, Shirt, ShoppingBag,
  ShoppingCart, Smartphone, Sparkles, Star, Tag, TrendingUp, Tv, Umbrella, Utensils, Wallet, Wifi, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Registro de iconos: la base de datos guarda la clave (p. ej. 'cart') y la UI
 * la resuelve aquí. Las claves existentes se mantienen por compatibilidad.
 */
export const ICONS: Record<string, LucideIcon> = {
  home: House, zap: Zap, water: Droplets, fire: Flame, wifi: Wifi, phone: Smartphone,
  car: Car, fuel: Fuel, bus: Bus, plane: Plane, beach: Umbrella,
  cart: ShoppingCart, bag: ShoppingBag, tag: Tag, clothes: Shirt,
  food: Utensils, coffee: Coffee,
  health: HeartPulse, pill: Pill, gym: Dumbbell, beauty: Scissors,
  tv: Tv, film: Clapperboard, music: Music, camera: Camera, games: Gamepad2,
  savings: PiggyBank, money: Banknote, wallet: Wallet, card: CreditCard, bank: Landmark,
  invest: TrendingUp, receipt: Receipt,
  work: Briefcase, laptop: Laptop, monitor: Monitor, book: BookOpen, school: GraduationCap,
  tools: Wrench, repair: Hammer, kids: Baby, pets: Dog,
  star: Star, gift: Gift, sparkles: Sparkles, repeat: Repeat, settings: Settings, default: CircleDot,
};

export const ICON_GROUPS: { label: string; icons: string[] }[] = [
  { label: 'Hogar y servicios', icons: ['home', 'zap', 'water', 'fire', 'wifi', 'phone', 'tools', 'repair'] },
  { label: 'Transporte', icons: ['car', 'fuel', 'bus', 'plane', 'beach'] },
  { label: 'Compras y comida', icons: ['cart', 'bag', 'clothes', 'tag', 'food', 'coffee'] },
  { label: 'Salud y cuidado', icons: ['health', 'pill', 'gym', 'beauty', 'kids', 'pets'] },
  { label: 'Ocio', icons: ['tv', 'film', 'music', 'camera', 'games'] },
  { label: 'Dinero', icons: ['savings', 'money', 'wallet', 'card', 'bank', 'invest', 'receipt'] },
  { label: 'Trabajo y estudio', icons: ['work', 'laptop', 'monitor', 'book', 'school'] },
  { label: 'Otros', icons: ['star', 'gift', 'sparkles', 'repeat', 'settings', 'default'] },
];

/** Alias de los iconos Bootstrap guardados por versiones anteriores. */
const BOOTSTRAP_ALIASES: Record<string, string> = {
  'bi-house': 'home', 'bi-house-fill': 'home', 'bi-car-front': 'car', 'bi-cart': 'cart', 'bi-bag': 'bag',
  'bi-lightning': 'zap', 'bi-lightning-fill': 'zap', 'bi-droplet': 'water', 'bi-fire': 'fire', 'bi-wifi': 'wifi',
  'bi-phone': 'phone', 'bi-tv': 'tv', 'bi-music-note': 'music', 'bi-film': 'film', 'bi-heart-pulse': 'health',
  'bi-briefcase': 'work', 'bi-cash': 'money', 'bi-piggy-bank': 'savings', 'bi-wallet': 'wallet',
  'bi-laptop': 'laptop', 'bi-book': 'book', 'bi-tag': 'tag', 'bi-star': 'star', 'bi-graph-up': 'invest',
  'bi-gear': 'settings', 'bi-gift': 'gift', 'bi-fast-food': 'food', 'bi-fuel-pump': 'fuel', 'bi-gym': 'gym',
};

export type ResolvedIcon =
  | { kind: 'lucide'; Icon: LucideIcon }
  | { kind: 'emoji'; text: string }
  | { kind: 'svg'; src: string };

/** Resuelve el valor guardado en la base de datos a algo renderizable. */
export function resolveIcon(value: string | null | undefined): ResolvedIcon {
  const key = (value ?? '').trim();
  if (!key) return { kind: 'lucide', Icon: CircleDot };
  if (ICONS[key]) return { kind: 'lucide', Icon: ICONS[key] };
  if (key.startsWith('bi-')) return { kind: 'lucide', Icon: ICONS[BOOTSTRAP_ALIASES[key] ?? 'default'] };
  if (key.startsWith('<svg')) return { kind: 'svg', src: `data:image/svg+xml;utf8,${encodeURIComponent(key)}` };
  if (!/^[a-z0-9_-]+$/i.test(key)) return { kind: 'emoji', text: key };
  return { kind: 'lucide', Icon: CircleDot };
}
