'use client';

/**
 * Hotel app shell — client wrapper around @dyafa/ui <AppShell>.
 *
 * Supplies the hotel nav config (role-gated from the caps the layout resolves),
 * a next/link adapter, the language switch (cookie + reload), the brand lockup
 * ("دافة" + "for Hotels"), and a user menu with a role chip + sign-out. Server
 * pages render their content as children inside this shell. Keeps the shared
 * AppShell free of any app-specific routing/auth concerns.
 *
 * Mirrors apps/admin/components/AdminAppShell.tsx.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import {
  AppShell,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type LinkComponent,
} from '@dyafa/ui';
import { dir, SUPPORTED_LOCALES, type Locale } from '@dyafa/i18n';
import { supabase } from '../lib/supabase/client';
import { hotelNavGroups, hotelActiveTitle, type NavCapabilities } from '../lib/hotel-nav';
import { T, tl } from '../lib/dashboard-i18n';

const LANG_LABEL: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  fr: 'Français',
};

/** Localized single-letter brand mark for the lockup. */
const BRAND_MARK: Record<Locale, string> = { ar: 'د', fr: 'D', en: 'D' };

// Adapt next/link to the LinkComponent contract (href + className + aria-current).
const NextLink: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

function setLocaleCookie(next: Locale) {
  document.cookie = `dyafa_locale=${next}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/** The signed-in caller's identity + capabilities, resolved server-side. */
export interface ShellUser extends NavCapabilities {
  /** Localized role chip text (reception / manager / owner). */
  roleLabel: string;
  /** Signed-in user's email (topbar identity); may be null. */
  email: string | null;
}

function avatarInitial(email: string | null): string {
  const c = (email ?? 'H').trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(c) ? c : 'H';
}

export function HotelAppShell({
  locale,
  user,
  children,
}: {
  locale: Locale;
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  const caps: NavCapabilities = {
    canManage: user.canManage,
    isOwner: user.isOwner,
    staffRole: user.staffRole,
  };

  const title = hotelActiveTitle(pathname, locale) || tl(T.dashboardLabel, locale);

  async function onSignOut() {
    try {
      await supabase.auth.signOut();
      await fetch('/api/session', { method: 'DELETE' });
    } catch {
      /* cookie clear above is authoritative for the server gate */
    } finally {
      router.replace('/sign-in');
      router.refresh();
    }
  }

  const brand = (
    <Link
      href="/"
      className="flex items-center gap-md rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
    >
      <span className="grid h-9 w-9 place-items-center rounded-sm bg-accent font-display text-heading-3 font-semibold text-text-on-primary shadow-xs">
        {BRAND_MARK[locale]}
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-title font-semibold text-text-on-primary">
          {tl(T.brand, locale)}
        </span>
        <span className="mt-0.5 text-overline font-semibold uppercase tracking-[0.14em] text-teal-200">
          {tl(T.brandTagline, locale)}
        </span>
      </span>
    </Link>
  );

  const brandCollapsed = (
    <Link
      href="/"
      aria-label={tl(T.brand, locale)}
      className="grid h-9 w-9 place-items-center rounded-sm bg-accent font-display text-heading-3 font-semibold text-text-on-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
    >
      {BRAND_MARK[locale]}
    </Link>
  );

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-sm rounded-pill border border-border bg-surface py-1 ps-1 pe-md shadow-xs transition-colors duration-fast hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <span className="grid h-7 w-7 place-items-center rounded-pill bg-primary text-caption font-semibold text-text-on-primary">
            {avatarInitial(user.email)}
          </span>
          <span className="hidden text-caption font-semibold text-text-default sm:inline">
            {user.roleLabel}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="flex flex-col">
            {user.email && (
              <span className="truncate text-body-sm font-medium text-text-default" dir="ltr">
                {user.email}
              </span>
            )}
            <span className="text-caption text-text-muted">{user.roleLabel}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onSignOut()} className="text-error">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {tl(T.signOut, locale)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppShell
      groups={hotelNavGroups(locale, caps)}
      pathname={pathname}
      dir={dir(locale)}
      brand={brand}
      brandCollapsed={brandCollapsed}
      link={NextLink}
      navLabel={tl(T.dashboardLabel, locale)}
      comingSoonLabel={locale === 'ar' ? 'قريبًا' : locale === 'fr' ? 'Bientôt' : 'Soon'}
      title={title}
      languages={SUPPORTED_LOCALES.map((code) => ({ code, label: LANG_LABEL[code] }))}
      currentLanguage={locale}
      onLanguageChange={(code) => setLocaleCookie(code as Locale)}
      languageLabel={locale === 'ar' ? 'اللغة' : locale === 'fr' ? 'Langue' : 'Language'}
      userMenu={userMenu}
      openMenuLabel={tl(T.openMenu, locale)}
      closeMenuLabel={tl(T.closeMenu, locale)}
      collapseLabel={
        locale === 'ar' ? 'طيّ الشريط الجانبي' : locale === 'fr' ? 'Réduire la barre' : 'Toggle sidebar'
      }
    >
      {children}
    </AppShell>
  );
}
