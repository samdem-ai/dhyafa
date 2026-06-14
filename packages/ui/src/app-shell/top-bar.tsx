'use client';

import { ChevronRight, Globe, Menu, PanelLeft } from 'lucide-react';
import { cn } from '../lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { LanguageOption } from './types';

export interface TopBarProps {
  /** Breadcrumb ancestor crumbs (the last/title is rendered separately). */
  breadcrumb?: string[];
  /** Page/section title (last crumb). */
  title: string;
  /** Language switcher. */
  languages: LanguageOption[];
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  languageLabel?: string;
  /** User menu trigger + content. */
  userMenu?: React.ReactNode;
  /** Mobile hamburger handler (opens the drawer). */
  onOpenDrawer?: () => void;
  openMenuLabel?: string;
  /** Desktop collapse toggle. */
  onToggleCollapse?: () => void;
  collapseLabel?: string;
  className?: string;
}

/** White top bar with breadcrumb/title, language menu, user menu, hamburger. */
export function TopBar({
  breadcrumb = [],
  title,
  languages,
  currentLanguage,
  onLanguageChange,
  languageLabel = 'Language',
  userMenu,
  onOpenDrawer,
  openMenuLabel = 'Open menu',
  onToggleCollapse,
  collapseLabel = 'Toggle sidebar',
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-header flex h-16 items-center justify-between gap-md border-b border-border bg-surface px-lg sm:px-xl',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-sm">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label={openMenuLabel}
            className="grid h-10 w-10 place-items-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapseLabel}
            className="hidden h-10 w-10 place-items-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:grid"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <div className="flex min-w-0 flex-col">
          <nav aria-label="Breadcrumb" className="flex items-center gap-xs text-caption text-text-muted">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-xs">
                {i > 0 && <ChevronRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" />}
                <span className="truncate">{crumb}</span>
              </span>
            ))}
            {breadcrumb.length > 0 && (
              <ChevronRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" />
            )}
            <span className="truncate text-text-default">{title}</span>
          </nav>
          <h1 className="truncate font-display text-heading-3 font-semibold text-primary">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={languageLabel}
              className="inline-flex h-10 items-center gap-xs rounded-sm border border-border bg-surface px-md text-body-sm font-semibold text-text-default shadow-xs transition-colors duration-fast hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Globe className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <span className="uppercase">{currentLanguage}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onSelect={() => onLanguageChange(lang.code)}
                className={cn(lang.code === currentLanguage && 'font-semibold text-primary')}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {userMenu}
      </div>
    </header>
  );
}
