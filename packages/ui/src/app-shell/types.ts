import type { LucideIcon } from 'lucide-react';

/** A single sidebar nav item. */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Optional count badge. */
  badge?: number;
  /** Render disabled with a "soon" hint (NEW routes not yet built). */
  comingSoon?: boolean;
}

/** A labelled group of nav items (overline section header). */
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Language option for the TopBar language switch. */
export interface LanguageOption {
  code: string;
  label: string;
}
