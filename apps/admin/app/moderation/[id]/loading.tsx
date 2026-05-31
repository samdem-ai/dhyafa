/**
 * Route-level loading skeleton for the listing-review detail page.
 */

export default function ListingReviewLoading() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="sticky top-0 z-header bg-primary px-xl py-md flex items-center shadow-card">
        <span className="font-display text-heading-3 font-semibold text-text-on-primary">
          دافة
        </span>
      </header>
      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-xl">
        <div className="h-10 w-72 rounded-md bg-surface-sunken animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-xl items-start">
          <div className="flex flex-col gap-xl">
            <div className="rounded-card bg-surface shadow-card p-xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] rounded-md bg-surface-sunken animate-pulse"
                  />
                ))}
              </div>
            </div>
            <div className="h-40 rounded-card bg-surface shadow-card animate-pulse" />
            <div className="h-40 rounded-card bg-surface shadow-card animate-pulse" />
          </div>
          <div className="flex flex-col gap-xl">
            <div className="h-48 rounded-card bg-surface shadow-card animate-pulse" />
            <div className="h-32 rounded-card bg-surface shadow-card animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
