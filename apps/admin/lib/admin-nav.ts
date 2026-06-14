/**
 * Admin sidebar nav config for the shared @dyafa/ui AppShell.
 *
 * Grouped per docs/rework/00-PLAN.md §3 (Operations / Finance / People /
 * Catalog / System). Existing routes are wired; NEW routes the plan introduces
 * (Listings, Roles, Settings) are marked `comingSoon` so they appear in the IA
 * without 404ing. Labels are localized via the {ar,fr,en} maps below.
 */

import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Scale,
  Star,
  Wallet,
  Users,
  KeyRound,
  LayoutGrid,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { NavGroup } from '@dyafa/ui';
import type { Locale } from '@dyafa/i18n';
import type { L10n } from './admin-i18n';

interface NavItemDef {
  href: string;
  label: L10n;
  icon: LucideIcon;
  comingSoon?: boolean;
}

interface NavGroupDef {
  label: L10n;
  items: NavItemDef[];
}

const GROUPS: NavGroupDef[] = [
  {
    label: { ar: 'عام', fr: 'Général', en: 'General' },
    items: [
      {
        href: '/',
        label: { ar: 'نظرة عامة', fr: 'Vue d’ensemble', en: 'Overview' },
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: { ar: 'العمليات', fr: 'Opérations', en: 'Operations' },
    items: [
      {
        href: '/moderation',
        label: { ar: 'المراجعة', fr: 'Modération', en: 'Moderation' },
        icon: ShieldCheck,
      },
      {
        href: '/listings',
        label: { ar: 'الإعلانات', fr: 'Annonces', en: 'Listings' },
        icon: Building2,
        comingSoon: true,
      },
      {
        href: '/bookings',
        label: { ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' },
        icon: CalendarCheck,
      },
      {
        href: '/disputes',
        label: { ar: 'النزاعات', fr: 'Litiges', en: 'Disputes' },
        icon: Scale,
      },
      {
        href: '/reviews',
        label: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
        icon: Star,
      },
    ],
  },
  {
    label: { ar: 'المالية', fr: 'Finance', en: 'Finance' },
    items: [
      {
        href: '/payments',
        label: { ar: 'المدفوعات', fr: 'Paiements', en: 'Payments' },
        icon: Wallet,
      },
    ],
  },
  {
    label: { ar: 'الأشخاص', fr: 'Personnes', en: 'People' },
    items: [
      {
        href: '/users',
        label: { ar: 'المستخدمون', fr: 'Utilisateurs', en: 'Users' },
        icon: Users,
      },
      {
        href: '/roles',
        label: { ar: 'الأدوار', fr: 'Rôles', en: 'Roles' },
        icon: KeyRound,
        comingSoon: true,
      },
    ],
  },
  {
    label: { ar: 'المحتوى', fr: 'Catalogue', en: 'Catalog' },
    items: [
      {
        href: '/content',
        label: { ar: 'المحتوى', fr: 'Contenu', en: 'Content' },
        icon: LayoutGrid,
      },
    ],
  },
  {
    label: { ar: 'النظام', fr: 'Système', en: 'System' },
    items: [
      {
        href: '/audit',
        label: { ar: 'سجل التدقيق', fr: 'Journal d’audit', en: 'Audit log' },
        icon: ScrollText,
      },
      {
        href: '/settings',
        label: { ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
        icon: Settings,
        comingSoon: true,
      },
    ],
  },
];

/** Build the localized nav groups for the AppShell sidebar. */
export function adminNavGroups(locale: Locale): NavGroup[] {
  return GROUPS.map((g) => ({
    label: g.label[locale],
    items: g.items.map((i) => ({
      href: i.href,
      label: i.label[locale],
      icon: i.icon,
      comingSoon: i.comingSoon,
    })),
  }));
}

/** Resolve the active nav item's label for the top-bar title (longest match). */
export function adminActiveTitle(pathname: string, locale: Locale): string {
  const flat = GROUPS.flatMap((g) => g.items);
  const match = flat
    .filter((i) => (i.href === '/' ? pathname === '/' : pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ? match.label[locale] : '';
}
