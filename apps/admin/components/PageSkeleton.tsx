/**
 * Generic route-level loading skeleton for admin pages. Mirrors the shell chrome
 * (brand bar) and shows pulsing placeholders for a title + a list/table, so the
 * layout doesn't jump when the Server Component's data resolves.
 */

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <main className="min-h-screen bg-bg">
      <header className="sticky top-0 z-header bg-primary px-xl py-md flex items-center shadow-card">
        <span className="font-display text-heading-3 font-semibold text-text-on-primary">دافة</span>
      </header>
      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-xl">
        <div className="h-8 w-56 rounded-md bg-surface-sunken animate-pulse" />
        <div className="rounded-card bg-surface shadow-card overflow-hidden">
          <ul>
            {Array.from({ length: rows }).map((_, i) => (
              <li key={i} className="border-b border-border last:border-0 px-xl py-md">
                <div className="flex items-center gap-md">
                  <div className="h-5 flex-1 rounded bg-surface-sunken animate-pulse" />
                  <div className="h-5 w-24 rounded bg-surface-sunken animate-pulse" />
                  <div className="h-5 w-16 rounded bg-surface-sunken animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
