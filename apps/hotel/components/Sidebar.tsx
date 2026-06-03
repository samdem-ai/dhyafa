'use client';

/**
 * Dashboard sidebar navigation (client component for active-link state + mobile
 * collapse). Items are gated by capability:
 *   • reception: Overview, Reservations, Messages, Calendar (read/close only), Analytics (occupancy)
 *   • manager/owner: everything
 *   • owner: Staff (owner-only)
 *
 * Capability gating here is a UX affordance; every Server Action / RPC re-checks
 * authorization server-side.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { dir, type Locale } from '@dyafa/i18n';
import { T, tl } from '../lib/dashboard-i18n';
import { SignOutButton } from './SignOutButton';

export interface NavCapabilities {
  canManage: boolean;
  isOwner: boolean;
  staffRoleLabel: string;
}

interface NavItem {
  href: string;
  label: keyof typeof T;
  /** Visible to reception too (default false → manager/owner only). */
  reception?: boolean;
  /** Owner-only (e.g. Staff). */
  ownerOnly?: boolean;
}

const NAV: readonly NavItem[] = [
  { href: '/', label: 'navOverview', reception: true },
  { href: '/reservations', label: 'navReservations', reception: true },
  { href: '/messages', label: 'navMessages', reception: true },
  { href: '/calendar', label: 'navCalendar', reception: true },
  { href: '/properties', label: 'navProperties' },
  { href: '/reviews', label: 'navReviews' },
  { href: '/analytics', label: 'navAnalytics', reception: true },
  { href: '/payouts', label: 'navPayouts' },
  { href: '/staff', label: 'navStaff', ownerOnly: true },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  locale,
  caps,
}: {
  locale: Locale;
  caps: NavCapabilities;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const direction = dir(locale);

  const items = NAV.filter((item) => {
    if (item.ownerOnly) return caps.isOwner;
    if (!item.reception) return caps.canManage;
    return true;
  });

  return (
    <>
      {/* Mobile top bar with menu toggle */}
      <div className="lg:hidden sticky top-0 z-header bg-primary px-lg py-md flex items-center justify-between shadow-card">
        <div className="flex items-center gap-sm">
          <span className="font-display text-heading-3 font-semibold text-text-on-primary">
            {tl(T.brand, locale)}
          </span>
          <span className="text-body-sm text-teal-200">{tl(T.dashboardLabel, locale)}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-md bg-teal-700 text-text-on-primary text-caption font-semibold px-md py-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          {tl(T.menu, locale)}
        </button>
      </div>

      <nav
        dir={direction}
        className={`${
          open ? 'block' : 'hidden'
        } lg:block lg:sticky lg:top-0 lg:h-screen w-full lg:w-64 shrink-0 bg-primary text-text-on-primary flex flex-col`}
      >
        <div className="hidden lg:flex flex-col gap-xs px-xl py-xl border-b border-teal-700">
          <span className="font-display text-heading-2 font-semibold text-text-on-primary">
            {tl(T.brand, locale)}
          </span>
          <span className="text-body-sm text-teal-200">{tl(T.dashboardLabel, locale)}</span>
        </div>

        <ul className="flex flex-col gap-xs px-md py-lg flex-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-md px-md py-sm text-body font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary ${
                    active
                      ? 'bg-accent text-text-on-primary'
                      : 'text-teal-100 hover:bg-teal-700 hover:text-text-on-primary'
                  }`}
                >
                  {tl(T[item.label], locale)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="px-md py-lg border-t border-teal-700 flex flex-col gap-sm">
          <span className="px-md text-caption text-teal-200">{caps.staffRoleLabel}</span>
          <SignOutButton locale={locale} />
        </div>
      </nav>
    </>
  );
}
