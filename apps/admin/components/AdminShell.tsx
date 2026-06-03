/**
 * Shared admin shell — sticky top bar + section nav + RTL-aware page frame.
 *
 * Server Component (no client state). Pages render their content as children;
 * the shell supplies the brand bar, the section navigation (highlighting the
 * active route), and the bone canvas + max-width container the existing pages
 * already use. Uses plain <a> (not next/link) to match the repo's @types/react
 * hoist quirk noted in the existing files.
 */

import { dir } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { C, NAV_ITEMS, tl } from '../lib/admin-i18n';
import { SignOutButton } from './SignOutButton';

/** Is `href` the active section for the current `pathname`? Root matches exactly. */
function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  locale,
  pathname,
  children,
}: {
  locale: Locale;
  /** The active route prefix, e.g. '/users' — drives nav highlighting. */
  pathname: string;
  children: React.ReactNode;
}) {
  const direction = dir(locale);

  return (
    <main dir={direction} className="min-h-screen bg-bg">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-header bg-primary px-xl py-md flex items-center justify-between shadow-card">
        <a
          href="/"
          className="flex items-center gap-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
        >
          <span className="font-display text-heading-3 font-semibold text-text-on-primary">
            {tl(C.brand, locale)}
          </span>
          <span className="text-body-sm text-teal-200">{tl(C.adminLabel, locale)}</span>
        </a>
        <div className="flex items-center gap-md">
          <span className="rounded-pill bg-teal-700 text-text-on-primary text-caption font-semibold px-md py-xs uppercase">
            {locale}
          </span>
          <SignOutButton locale={locale} />
        </div>
      </header>

      {/* ── Section nav (horizontal, scrollable on small screens) ─────────── */}
      <nav
        aria-label={tl(C.adminLabel, locale)}
        className="sticky top-[60px] z-dropdown bg-surface border-b border-border overflow-x-auto"
      >
        <ul className="max-w-screen-xl mx-auto px-xl flex items-stretch gap-xs">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center px-md py-md text-body-sm font-semibold whitespace-nowrap border-b-2 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                    active
                      ? 'border-accent text-primary'
                      : 'border-transparent text-text-muted hover:text-text-default'
                  }`}
                >
                  {tl(item.label, locale)}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-xl">
        {children}
      </div>
    </main>
  );
}
