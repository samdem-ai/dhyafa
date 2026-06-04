'use client';

/**
 * Dashboard chrome — fixed dark left sidebar + sticky top bar — for all
 * authenticated hotel routes. Client component (active-link state, mobile
 * overlay, language popover). Wraps the page `children`.
 *
 * Nav items are gated by capability:
 *   • reception: Overview, Reservations, Messages, Calendar, Analytics (occupancy)
 *   • manager/owner: everything
 *   • owner: Staff (owner-only)
 *
 * Capability gating here is a UX affordance; every Server Action / RPC re-checks
 * authorization server-side.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import { dir, type Locale } from '@dyafa/i18n';
import { T, tl } from '../lib/dashboard-i18n';
import { SignOutButton } from './SignOutButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  BrandMark,
  HomeIcon,
  BookingIcon,
  MessageIcon,
  CalendarIcon,
  BuildingIcon,
  StarIcon,
  ChartIcon,
  WalletIcon,
  UsersIcon,
  MenuIcon,
  CloseIcon,
  type IconProps,
} from './icons';

export interface NavCapabilities {
  canManage: boolean;
  isOwner: boolean;
  staffRoleLabel: string;
  /** Signed-in user's email (for the topbar avatar/identity). */
  email: string | null;
}

type GroupKey = 'main' | 'operations' | 'business';

interface NavItem {
  href: string;
  label: keyof typeof T;
  icon: ComponentType<IconProps>;
  group: GroupKey;
  /** Visible to reception too (default false → manager/owner only). */
  reception?: boolean;
  /** Owner-only (e.g. Staff). */
  ownerOnly?: boolean;
}

const NAV: readonly NavItem[] = [
  { href: '/', label: 'navOverview', icon: HomeIcon, group: 'main', reception: true },
  { href: '/reservations', label: 'navReservations', icon: BookingIcon, group: 'operations', reception: true },
  { href: '/messages', label: 'navMessages', icon: MessageIcon, group: 'operations', reception: true },
  { href: '/calendar', label: 'navCalendar', icon: CalendarIcon, group: 'operations', reception: true },
  { href: '/properties', label: 'navProperties', icon: BuildingIcon, group: 'business' },
  { href: '/reviews', label: 'navReviews', icon: StarIcon, group: 'business' },
  { href: '/analytics', label: 'navAnalytics', icon: ChartIcon, group: 'business', reception: true },
  { href: '/payouts', label: 'navPayouts', icon: WalletIcon, group: 'business' },
  { href: '/staff', label: 'navStaff', icon: UsersIcon, group: 'business', ownerOnly: true },
] as const;

const GROUP_LABEL: Record<GroupKey, keyof typeof T> = {
  main: 'navGroupMain',
  operations: 'navGroupOperations',
  business: 'navGroupBusiness',
};

const GROUP_ORDER: GroupKey[] = ['main', 'operations', 'business'];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function avatarInitial(email: string | null): string {
  const c = (email ?? 'H').trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(c) ? c : 'H';
}

export function Sidebar({
  locale,
  caps,
  children,
}: {
  locale: Locale;
  caps: NavCapabilities;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const direction = dir(locale);

  // Close the mobile drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [open]);

  const items = NAV.filter((item) => {
    if (item.ownerOnly) return caps.isOwner;
    if (!item.reception) return caps.canManage;
    return true;
  });

  const activeItem = items.find((i) => isActive(pathname, i.href));
  const pageTitle = activeItem ? tl(T[activeItem.label], locale) : tl(T.dashboardLabel, locale);

  const navContent = (
    <nav className="flex flex-1 flex-col gap-xl overflow-y-auto px-md py-lg" aria-label={tl(T.dashboardLabel, locale)}>
      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-xs">
            <span className="px-md text-overline font-semibold uppercase tracking-wider text-teal-200/70">
              {tl(T[GROUP_LABEL[group]], locale)}
            </span>
            <ul className="flex flex-col gap-px">
              {groupItems.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-md rounded-md px-md py-sm text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar-bg)] ${
                        active
                          ? 'bg-white/10 text-text-on-primary'
                          : 'text-teal-100 hover:bg-white/5 hover:text-text-on-primary'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 start-0 w-1 rounded-pill bg-accent"
                        />
                      )}
                      <Icon
                        size={19}
                        className={active ? 'text-accent' : 'text-teal-200 group-hover:text-text-on-primary'}
                      />
                      <span>{tl(T[item.label], locale)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-sm px-xl py-lg">
      <span className="grid size-10 place-items-center rounded-md bg-white/10 text-text-on-primary">
        <BrandMark size={24} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-heading-3 font-semibold text-text-on-primary">
          {tl(T.brand, locale)}
        </span>
        <span className="text-overline uppercase tracking-wider text-teal-200/80">
          {tl(T.brandTagline, locale)}
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="border-t border-white/10 px-md py-md">
      <div className="mb-sm flex items-center gap-sm rounded-md px-md py-sm">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/90 text-body-sm font-semibold text-text-on-primary">
          {avatarInitial(caps.email)}
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body-sm font-medium text-text-on-primary" dir="ltr">
            {caps.email ?? tl(T.account, locale)}
          </span>
          <span className="text-overline uppercase tracking-wide text-teal-200/80">
            {caps.staffRoleLabel}
          </span>
        </div>
      </div>
      <SignOutButton locale={locale} variant="sidebar" />
    </div>
  );

  return (
    <div dir={direction} className="min-h-screen bg-bg lg:flex">
      {/* ── Desktop sidebar (fixed dark rail) ─────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[color:var(--sidebar-bg)] text-text-on-primary lg:flex">
        {brand}
        {navContent}
        {footer}
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-overlay lg:hidden">
          <button
            type="button"
            aria-label={tl(T.closeMenu, locale)}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-overlay"
          />
          <aside
            dir={direction}
            className="absolute inset-y-0 start-0 flex w-[280px] max-w-[82%] flex-col bg-[color:var(--sidebar-bg)] text-text-on-primary shadow-sheet"
          >
            <div className="flex items-center justify-between pe-md">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={tl(T.closeMenu, locale)}
                className="grid size-9 place-items-center rounded-md text-teal-100 transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            {navContent}
            {footer}
          </aside>
        </div>
      )}

      {/* ── Content column ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-header border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
          <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-md px-lg sm:px-2xl">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={tl(T.openMenu, locale)}
              className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-default transition-colors duration-fast hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
            >
              <MenuIcon size={20} />
            </button>

            {/* Breadcrumb / page label */}
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-overline uppercase tracking-wider text-text-muted">
                {tl(T.dashboardLabel, locale)}
              </span>
              <span className="truncate font-display text-title font-semibold text-primary">
                {pageTitle}
              </span>
            </div>

            <div className="ms-auto flex items-center gap-sm">
              <LanguageSwitcher locale={locale} />
              <span className="hidden items-center gap-sm rounded-full border border-border bg-surface ps-xs pe-md py-xs sm:inline-flex">
                <span className="grid size-7 place-items-center rounded-full bg-accent/90 text-caption font-semibold text-text-on-primary">
                  {avatarInitial(caps.email)}
                </span>
                <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                  {caps.staffRoleLabel}
                </span>
              </span>
              <SignOutButton locale={locale} variant="icon" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-xl flex-1 px-lg py-xl sm:px-2xl sm:py-2xl">
          <div className="flex flex-col gap-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
