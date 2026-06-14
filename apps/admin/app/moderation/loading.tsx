/**
 * Route-level loading skeleton for the moderation queue.
 * Rendered by the App Router while the Server Component awaits data. Uses the
 * shared @dyafa/ui skeleton primitives so it matches the migrated table chrome.
 */

import { Skeleton, SkeletonTable } from '@dyafa/ui';

export default function ModerationLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-xl px-lg py-2xl sm:px-xl">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10 w-full max-w-xs" />
      <SkeletonTable rows={6} cols={6} />
    </main>
  );
}
