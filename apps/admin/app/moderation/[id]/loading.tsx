/**
 * Route-level loading skeleton for the listing-review detail page.
 * Uses shared @dyafa/ui skeleton primitives to match the migrated 2-col layout.
 */

import { Skeleton, SkeletonCard } from '@dyafa/ui';

export default function ListingReviewLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-xl px-lg py-2xl sm:px-xl">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 items-start gap-xl lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-xl">
          <div className="rounded-card border border-border bg-surface p-xl shadow-card">
            <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-md" />
              ))}
            </div>
          </div>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
        </div>
        <div className="flex flex-col gap-xl">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </main>
  );
}
