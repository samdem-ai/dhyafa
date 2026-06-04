/**
 * Shared admin shell — fixed dark sidebar + sticky top bar + RTL-aware frame.
 *
 * Server Component (no client state). Pages render their content as children;
 * the shell supplies the deep-teal sidebar (brand lockup + grouped section nav
 * highlighting the active route), a sticky top bar (section title + breadcrumb,
 * language switcher, user/role chip, sign-out), and the bone content canvas the
 * pages fill. Two small client islands handle the locale switch + mobile drawer.
 *
 * Uses plain <a> (not next/link) to match the repo's @types/react hoist quirk
 * noted in the existing files. RTL works via CSS logical utilities (ps-/pe-/
 * ms-/me-/start/end) + dir-awareness, so Arabic mirrors automatically.
 */

import { dir } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { C, NAV_GROUPS, NAV_ITEMS, tl, type NavItem } from '../lib/admin-i18n';
import { SignOutButton } from './SignOutButton';
import { LocaleSwitcher } from './LocaleSwitcher';
import { MobileNav } from './MobileNav';
import { ChevronRightIcon } from './icons';

/** Is `href` the active section for the current `pathname`? Root matches exactly. */
function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve the active nav item (for the top-bar breadcrumb/title). */
function activeItem(pathname: string): NavItem | undefined {
  // Longest matching href wins (so /content/banners → Content, not Overview).
  return [...NAV_ITEMS]
    .filter((i) => isActive(i.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

// ─── Sidebar nav (shared by desktop rail + mobile drawer) ────────────────────

function NavLink({ item, pathname, locale }: { item: NavItem; pathname: string; locale: Locale }) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-md rounded-md px-md py-sm text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
        active
          ? 'bg-teal-700/55 text-text-on-primary'
          : 'text-teal-200 hover:bg-teal-700/35 hover:text-text-on-primary'
      }`}
    >
      {/* Active accent bar (logical start edge → mirrors in RTL) */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 start-0 w-[3px] rounded-pill bg-accent transition-opacity duration-fast ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-fast ${
          active ? 'text-accent' : 'text-teal-400 group-hover:text-teal-200'
        }`}
      />
      <span className="truncate">{tl(item.label, locale)}</span>
    </a>
  );
}

function SidebarContent({ locale, pathname }: { locale: Locale; pathname: string }) {
  return (
    <>
      {/* Brand lockup */}
      <a
        href="/"
        className="flex items-center gap-md px-lg py-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
      >
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent font-display text-heading-3 font-semibold text-text-on-primary shadow-xs">
          {tl(C.brandMark, locale)}
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display text-title font-semibold text-text-on-primary">
            {tl(C.brand, locale)}
          </span>
          <span className="mt-0.5 text-overline font-semibold uppercase tracking-[0.14em] text-teal-200">
            {tl(C.adminLabel, locale)}
          </span>
        </span>
      </a>

      {/* Grouped nav */}
      <nav
        aria-label={tl(C.adminLabel, locale)}
        className="scrollbar-dark flex-1 overflow-y-auto px-md pb-lg"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label.en} className="mb-lg">
            <p className="px-md pb-xs pt-sm text-overline font-semibold uppercase tracking-[0.14em] text-teal-400">
              {tl(group.label, locale)}
            </p>
            <div className="flex flex-col gap-xs">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} locale={locale} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export function AdminShell({
  locale,
  pathname,
  children,
}: {
  locale: Locale;
  /** The active route prefix, e.g. '/users' — drives nav highlighting + breadcrumb. */
  pathname: string;
  children: React.ReactNode;
}) {
  const direction = dir(locale);
  const active = activeItem(pathname);
  const sectionTitle = active ? tl(active.label, locale) : tl(C.adminLabel, locale);

  return (
    <div dir={direction} className="min-h-screen bg-bg text-text-default">
      {/* ── Fixed desktop sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 start-0 z-dropdown hidden w-[248px] flex-col bg-teal-900 lg:flex">
        <SidebarContent locale={locale} pathname={pathname} />
      </aside>

      {/* ── Content column (offset by the sidebar on desktop) ─────────────── */}
      <div className="flex min-h-screen flex-col lg:ps-[248px]">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-header flex h-16 items-center justify-between gap-md border-b border-border bg-bg/85 px-lg backdrop-blur-md sm:px-xl">
          <div className="flex min-w-0 items-center gap-sm">
            {/* Mobile drawer trigger (reuses the server-rendered sidebar) */}
            <MobileNav openLabel={tl(C.openMenu, locale)} closeLabel={tl(C.closeMenu, locale)}>
              <SidebarContent locale={locale} pathname={pathname} />
            </MobileNav>

            <div className="flex min-w-0 flex-col">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-xs text-caption text-text-muted"
              >
                <span>{tl(C.adminLabel, locale)}</span>
                <ChevronRightIcon className="h-3 w-3 rtl:-scale-x-100" />
                <span className="truncate text-text-default">{sectionTitle}</span>
              </nav>
              <h1 className="truncate font-display text-heading-3 font-semibold text-primary">
                {sectionTitle}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-sm sm:gap-md">
            <LocaleSwitcher current={locale} />

            {/* User chip + sign-out */}
            <div className="hidden items-center gap-sm rounded-pill border border-border bg-surface py-1 ps-1 pe-md shadow-xs sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-pill bg-primary text-caption font-semibold text-text-on-primary">
                {tl(C.avatarInitials, locale)}
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-caption font-semibold text-text-default">
                  {tl(C.adminLabel, locale)}
                </span>
                <span className="text-overline uppercase tracking-wide text-text-muted">
                  {tl(C.roleChip, locale)}
                </span>
              </span>
            </div>
            <SignOutButton locale={locale} />
          </div>
        </header>

        {/* Page canvas */}
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-xl px-lg py-2xl sm:px-xl">
          {children}
        </main>
      </div>
    </div>
  );
}
