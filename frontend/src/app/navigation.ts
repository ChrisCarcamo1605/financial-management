import {
  ArrowLeftRight, CalendarRange, ChartNoAxesColumn, HandCoins, House, Landmark, PiggyBank, Receipt,
  Settings, Target, Wallet, type LucideIcon,
} from 'lucide-react';
import type { Dictionary } from '@/i18n';

export type NavId = keyof Dictionary['shell']['nav']['items'];

export interface NavItem {
  id: NavId;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Clave del título del grupo; null = grupo principal sin título. */
  label: keyof Dictionary['shell']['nav']['groups'] | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { id: 'home', to: '/', icon: House },
      { id: 'transactions', to: '/movimientos', icon: ArrowLeftRight },
      { id: 'quincenas', to: '/quincenas', icon: CalendarRange },
      { id: 'accounts', to: '/cuentas', icon: Wallet },
    ],
  },
  {
    label: 'planning',
    items: [
      { id: 'budgets', to: '/presupuestos', icon: Target },
      { id: 'savings', to: '/ahorro', icon: PiggyBank },
      { id: 'services', to: '/servicios', icon: Receipt },
      { id: 'loans', to: '/prestamos', icon: Landmark },
      { id: 'income', to: '/ingresos', icon: HandCoins },
    ],
  },
  {
    label: 'analysis',
    items: [{ id: 'analytics', to: '/analisis', icon: ChartNoAxesColumn }],
  },
];

export const SETTINGS_ITEM: NavItem = { id: 'settings', to: '/ajustes', icon: Settings };

export const ALL_NAV_ITEMS = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

/** Tab bar móvil: los destinos más frecuentes; el resto vive en "Más". */
export const MOBILE_PRIMARY = ['/', '/movimientos', '/quincenas'];
