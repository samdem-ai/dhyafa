'use client';

import { useEffect, useState } from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { cn } from '../lib/cn';
import { Sidebar, type LinkComponent } from './sidebar';
import { TopBar } from './top-bar';
import type { LanguageOption, NavGroup } from './types';

const COLLAPSE_KEY = 'dyafa.sidebar.collapsed';

export interface AppShellProps {
  groups: NavGroup[];
  pathname: string;
  /** Text direction. The shell does NOT set <html dir> (the app layout owns that). */
  dir?: 'ltr' | 'rtl';
  brand: React.ReactNode;
  /** Compact brand (icon-only) shown when collapsed. Falls back to `brand`. */
  brandCollapsed?: React.ReactNode;
  link?: LinkComponent;
  navLabel?: string;
  comingSoonLabel?: string;
  // TopBar
  breadcrumb?: string[];
  title: string;
  languages: LanguageOption[];
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  languageLabel?: string;
  userMenu?: React.ReactNode;
  openMenuLabel?: string;
  closeMenuLabel?: string;
  collapseLabel?: string;
  /** Constrain main content width. Default true (max-w-[1280px]). */
  constrainContent?: boolean;
  children: React.ReactNode;
}

/** App shell: persistent sidebar + sticky top bar + main canvas. */
export function AppShell({
  groups,
  pathname,
  dir = 'ltr',
  brand,
  brandCollapsed,
  link,
  navLabel,
  comingSoonLabel,
  breadcrumb,
  title,
  languages,
  currentLanguage,
  onLanguageChange,
  languageLabel,
  userMenu,
  openMenuLabel,
  closeMenuLabel = 'Close menu',
  collapseLabel,
  constrainContent = true,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Restore collapse preference (client-only to avoid hydration mismatch).
  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  // Close drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Escape closes the drawer + lock scroll while open.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Avoid flashing the collapsed state before hydration.
  const effectiveCollapsed = mounted ? collapsed : false;
  const railWidth = effectiveCollapsed ? 'lg:w-[72px]' : 'lg:w-[248px]';
  const contentOffset = effectiveCollapsed ? 'lg:ps-[72px]' : 'lg:ps-[248px]';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-bg text-text-default">
        {/* Desktop sidebar */}
        <aside className={cn('fixed inset-y-0 start-0 z-dropdown hidden flex-col lg:flex', railWidth)}>
          <Sidebar
            groups={groups}
            pathname={pathname}
            collapsed={effectiveCollapsed}
            brand={effectiveCollapsed ? (brandCollapsed ?? brand) : brand}
            link={link}
            navLabel={navLabel}
            comingSoonLabel={comingSoonLabel}
          />
        </aside>

        {/* Mobile off-canvas drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-overlay lg:hidden">
            <button
              type="button"
              aria-label={closeMenuLabel}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-overlay backdrop-blur-[1px] animate-in fade-in-0 duration-fast motion-reduce:animate-none"
            />
            <div className="absolute inset-y-0 start-0 w-[272px] max-w-[82%] shadow-sheet animate-in fade-in-0 duration-base motion-reduce:animate-none">
              <Sidebar
                groups={groups}
                pathname={pathname}
                brand={brand}
                link={link}
                navLabel={navLabel}
                comingSoonLabel={comingSoonLabel}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Content column */}
        <div className={cn('flex min-h-screen flex-col', contentOffset)}>
          <TopBar
            breadcrumb={breadcrumb}
            title={title}
            languages={languages}
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
            languageLabel={languageLabel}
            userMenu={userMenu}
            onOpenDrawer={() => setDrawerOpen(true)}
            openMenuLabel={openMenuLabel}
            onToggleCollapse={toggleCollapse}
            collapseLabel={collapseLabel}
          />
          <main
            className={cn(
              'flex w-full flex-1 flex-col gap-xl px-lg py-2xl sm:px-xl',
              constrainContent && 'mx-auto max-w-[1280px]',
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
