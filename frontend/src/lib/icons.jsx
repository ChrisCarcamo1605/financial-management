/**
 * Icon registry — maps a simple string key to a Lucide React component.
 * Store the key in DB (icon column). The Icon component resolves it here.
 *
 * Keys are deliberately short so they're easy to store and read.
 * Backward-compat aliases: old 'bi-*' names and emojis are handled in Icon.jsx.
 */
import {
  LuHome, LuCar, LuShoppingCart, LuShoppingBag,
  LuZap, LuDroplets, LuFlame, LuWifi, LuSmartphone,
  LuTv, LuMusic, LuClapperboard,
  LuHeartPulse, LuPill,
  LuPlane, LuUmbrella, LuGraduationCap,
  LuBriefcase, LuBanknote, LuPiggyBank, LuWallet,
  LuLaptop, LuMonitor, LuCamera,
  LuBookOpen, LuTag, LuStar, LuRepeat,
  LuSettings, LuCircleDot, 
} from 'react-icons/lu';

import { FaGift } from 'react-icons/fa';
import { IoFastFood } from 'react-icons/io5'; 
import { BsFuelPumpFill } from "react-icons/bs";
import { CgGym } from "react-icons/cg";
// ── Registry ────────────────────────────────────────────────────────────────
export const ICON_MAP = {
  // Home & living
  home:           LuHome,
  // Transport
  car:            LuCar,
  fuel:           BsFuelPumpFill,
  // Shopping
  cart:           LuShoppingCart,
  bag:            LuShoppingBag,
  // Utilities / services
  zap:            LuZap,
  water:          LuDroplets,
  fire:           LuFlame,
  wifi:           LuWifi,
  phone:          LuSmartphone,
  // Entertainment
  tv:             LuTv,
  music:          LuMusic,
  film:           LuClapperboard,
  // Health
  health:         LuHeartPulse,
  gym:            CgGym,
  pill:           LuPill,
  // Travel
  plane:          LuPlane,
  beach:          LuUmbrella,
  // Education & work
  school:         LuGraduationCap,
  work:           LuBriefcase,
  // Finance / savings
  money:          LuBanknote,
  savings:        LuPiggyBank,
  wallet:         LuWallet,
  // Tech
  laptop:         LuLaptop,
  monitor:        LuMonitor,
  camera:         LuCamera,
  // Misc
  book:           LuBookOpen,
  tag:            LuTag,
  star:           LuStar,
  repeat:         LuRepeat,
  settings:       LuSettings,
  default:        LuCircleDot,
  gift:           FaGift,
  food:           IoFastFood,
};

// ── Bootstrap icon → key aliases (backward compat with old DB data) ─────────
export const BI_ALIAS = {
  'bi-house':          'home',
  'bi-house-fill':     'home',
  'bi-car-front':      'car',
  'bi-cart':           'cart',
  'bi-bag':            'bag',
  'bi-lightning':      'zap',
  'bi-lightning-fill': 'zap',
  'bi-droplet':        'water',
  'bi-fire':           'fire',
  'bi-wifi':           'wifi',
  'bi-phone':          'phone',
  'bi-tv':             'tv',
  'bi-music-note':     'music',
  'bi-film':           'film',
  'bi-heart-pulse':    'health',
  'bi-briefcase':      'work',
  'bi-cash':           'money',
  'bi-piggy-bank':     'savings',
  'bi-wallet':         'wallet',
  'bi-laptop':         'laptop',
  'bi-book':           'book',
  'bi-tag':            'tag',
  'bi-star':           'star',
  'bi-graph-up':       'money',
  'bi-gear':           'settings',
  'bi-gift':           'gift',
  'bi-fast-food':      'food',
  'bi-fuel-pump':      'fuel',
  'bi-gym':            'gym',
};

// ── Picker groups (used in modals) ──────────────────────────────────────────
export const ICON_GROUPS = [
  { label: 'Hogar',        icons: ['home', 'zap', 'water', 'fire', 'wifi', 'phone'] },
  { label: 'Transporte',   icons: ['car', 'plane', 'beach', 'fuel'] },
  { label: 'Compras',      icons: ['cart', 'bag', 'tag'] },
  { label: 'Salud',        icons: ['health', 'pill', 'gym'] },
  { label: 'Entretenim.',  icons: ['tv', 'film', 'music', 'camera'] },
  { label: 'Finanzas',     icons: ['savings', 'money', 'wallet'] },
  { label: 'Trabajo',      icons: ['work', 'laptop', 'monitor', 'book', 'school'] },
  { label: 'Otros',        icons: ['star', 'repeat', 'settings', 'default', 'gift', 'food'] },
];
