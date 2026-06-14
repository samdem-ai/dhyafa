/**
 * Hotel sidebar nav config for the shared @dyafa/ui AppShell.
 *
 * Grouped per docs/rework/00-PLAN.md §3 (Front desk / Property / Business /
 * Settings). Every wired href maps to an existing route; the one NEW item the
 * plan introduces (Account `/settings`) is marked `comingSoon` so it renders in
 * the IA as a disabled entry rather than a live link to a 404. Labels are
 * localized via the {ar,fr,en} maps below.
 *
 * Role-gating (UX affordance — every Server Action / RPC re-checks server-side):
 *   • reception: Front desk (Overview/Reservations/Messages) + Calendar +
 *     Reviews (read) + a limited Analytics (occupancy summary).
 *   • manager:   everything except Staff.
 *   • owner:     everything, including Staff (owner-only).
 * Matches the reception-vs-manager capability matrix in §3.
 */

import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  Building2,
  CalendarRange,
  Star,
  Wallet,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { NavGroup } from '@dyafa/ui';
import type { Locale } from '@dyafa/i18n';
import type { L10n } from './dashboard-i18n';

/** Capability flags resolved by the dashboard layout (mirrors lib/auth helpers). */
export interface NavCapabilities {
  /** Owner or manager (can perform manager-level actions). */
  canManage: boolean;
  /** Owns the host account (vs. employed staff). */
  isOwner: boolean;
  /** `reception` | `manager` for staff; `null` for an owner. */
  staffRole: 'reception' | 'manager' | null;
}

interface NavItemDef {
  href: string;
  label: L10n;
  icon: LucideIcon;
  /** Visible to reception too (default false → manager/owner only). */
  reception?: boolean;
  /** Owner-only (e.g. Staff). */
  ownerOnly?: boolean;
  /** Render disabled with a "soon" hint (NEW routes not yet built). */
  comingSoon?: boolean;
}

interface NavGroupDef {
  label: L10n;
  items: NavItemDef[];
}

const GROUPS: NavGroupDef[] = [
  {
    label: { ar: 'الاستقبال', fr: 'Réception', en: 'Front desk' },
    items: [
      {
        href: '/',
        label: { ar: 'نظرة عامة', fr: 'Vue d’ensemble', en: 'Overview' },
        icon: LayoutDashboard,
        reception: true,
      },
      {
        href: '/reservations',
        label: { ar: 'الحجوزات', fr: 'Réservations', en: 'Reservations' },
        icon: CalendarCheck,
        reception: true,
      },
      {
        href: '/messages',
        label: { ar: 'الرسائل', fr: 'Messages', en: 'Messages' },
        icon: MessageSquare,
        reception: true,
      },
    ],
  },
  {
    label: { ar: 'العقار', fr: 'Propriété', en: 'Property' },
    items: [
      {
        href: '/properties',
        label: { ar: 'العقارات', fr: 'Propriétés', en: 'Properties' },
        icon: Building2,
      },
      {
        href: '/calendar',
        label: { ar: 'التقويم', fr: 'Calendrier', en: 'Calendar' },
        icon: CalendarRange,
        reception: true,
      },
      {
        href: '/reviews',
        label: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
        icon: Star,
        reception: true,
      },
    ],
  },
  {
    label: { ar: 'الأعمال', fr: 'Activité', en: 'Business' },
    items: [
      {
        href: '/payouts',
        label: { ar: 'المدفوعات', fr: 'Virements', en: 'Payouts' },
        icon: Wallet,
      },
      {
        href: '/analytics',
        label: { ar: 'الإحصائيات', fr: 'Analytiques', en: 'Analytics' },
        icon: BarChart3,
        reception: true,
      },
    ],
  },
  {
    label: { ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
    items: [
      {
        href: '/staff',
        label: { ar: 'الفريق', fr: 'Équipe', en: 'Staff' },
        icon: Users,
        ownerOnly: true,
      },
      {
        href: '/settings',
        label: { ar: 'الحساب', fr: 'Compte', en: 'Account' },
        icon: Settings,
        comingSoon: true,
        reception: true,
      },
    ],
  },
];

/** Whether the given capabilities may see a nav item at all. */
function canSee(item: NavItemDef, caps: NavCapabilities): boolean {
  if (item.ownerOnly) return caps.isOwner;
  if (!item.reception) return caps.canManage;
  return true;
}

/**
 * Build the localized, role-gated nav groups for the AppShell sidebar.
 * Items the caller can't access are omitted; NEW (unbuilt) routes are kept but
 * flagged `comingSoon` so the AppShell renders them disabled (never a 404 link).
 * Empty groups (all items gated out) are dropped.
 */
export function hotelNavGroups(locale: Locale, caps: NavCapabilities): NavGroup[] {
  return GROUPS.map((g) => ({
    label: g.label[locale],
    items: g.items
      .filter((i) => canSee(i, caps))
      .map((i) => ({
        href: i.href,
        label: i.label[locale],
        icon: i.icon,
        comingSoon: i.comingSoon,
      })),
  })).filter((g) => g.items.length > 0);
}

/** Resolve the active nav item's label for the top-bar title (longest match). */
export function hotelActiveTitle(pathname: string, locale: Locale): string {
  const flat = GROUPS.flatMap((g) => g.items);
  const match = flat
    .filter((i) =>
      i.href === '/' ? pathname === '/' : pathname === i.href || pathname.startsWith(`${i.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ? match.label[locale] : '';
}
