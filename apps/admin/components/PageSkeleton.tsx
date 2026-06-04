/**
 * Generic route-level loading skeleton for admin pages. Mirrors the new shell
 * chrome (dark sidebar rail + sticky top bar) and shows pulsing placeholders for
 * a header + a table, so the layout doesn't jump when the Server Component's
 * data resolves.
 */

import { TableSkeleton } from './ui';

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar rail placeholder (desktop) */}
      <aside className="fixed inset-y-0 start-0 z-dropdown hidden w-[248px] flex-col gap-md bg-teal-900 px-md py-lg lg:flex">
        <div className="mx-md mb-lg h-9 w-32 rounded-md bg-teal-700/50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mx-xs h-9 rounded-md bg-teal-700/30" />
        ))}
      </aside>

      <div className="flex min-h-screen flex-col lg:ps-[248px]">
        <header className="sticky top-0 z-header flex h-16 items-center justify-between border-b border-border bg-bg/85 px-xl backdrop-blur-md">
          <div className="flex flex-col gap-xs">
            <div className="h-2.5 w-24 rounded-pill bg-surface-sunken" />
            <div className="h-5 w-40 rounded-pill bg-surface-sunken" />
          </div>
          <div className="h-9 w-28 rounded-pill bg-surface-sunken" />
        </header>

        <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-xl px-xl py-2xl">
          <div className="flex flex-col gap-sm">
            <div className="h-7 w-56 animate-pulse rounded-md bg-surface-sunken" />
            <div className="h-4 w-72 animate-pulse rounded-md bg-surface-sunken" />
          </div>
          <TableSkeleton rows={rows} cols={5} />
        </main>
      </div>
    </div>
  );
}
