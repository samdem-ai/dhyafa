'use client';

/**
 * Mobile sidebar drawer for the admin shell (<1024px).
 *
 * The desktop sidebar is a static Server-Component element; on small screens it
 * is hidden and this client island provides a hamburger trigger that slides the
 * SAME nav content in as an overlay. Nav markup is passed as `children`, so it
 * stays server-rendered (no nav data leaks into the client bundle). Closes on
 * route change, Escape, scrim click, and any nav-link click (event delegation).
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MenuIcon, CloseIcon } from './icons';

export function MobileNav({
  children,
  openLabel,
  closeLabel,
}: {
  children: React.ReactNode;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={openLabel}
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-md text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-overlay lg:hidden">
          {/* Scrim */}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="admin-scrim absolute inset-0 bg-overlay backdrop-blur-[1px]"
          />
          {/* Drawer (reuses the server-rendered sidebar content) */}
          <div
            className="admin-drawer absolute inset-y-0 start-0 flex w-[272px] max-w-[82%] flex-col bg-teal-900 shadow-sheet"
            onClick={(e) => {
              // Close when a nav link inside is activated.
              if ((e.target as HTMLElement).closest('a')) setOpen(false);
            }}
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
}
