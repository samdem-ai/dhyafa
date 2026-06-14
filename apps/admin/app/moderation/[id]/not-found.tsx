/**
 * Not-found surface for a listing that doesn't exist (or was already handled).
 * Rendered when the detail page calls `notFound()`. Uses the shared AppShell +
 * EmptyState so it stays consistent with the migrated moderation flow.
 */

import Link from 'next/link';
import { EmptyState } from '@dyafa/ui';
import { resolveLocale } from '../../../lib/i18n';
import { AdminAppShell } from '../../../components/AdminAppShell';
import { M, tl } from '../../../lib/moderation-i18n';

export default function ListingNotFound() {
  const locale = resolveLocale();
  return (
    <AdminAppShell locale={locale}>
      <EmptyState
        preset="no-results"
        title={tl(M.notFoundTitle, locale)}
        description={tl(M.notFoundBody, locale)}
        action={
          <Link
            href="/moderation"
            className="inline-flex h-10 items-center justify-center rounded-sm bg-primary px-lg text-body-sm font-semibold text-text-on-primary shadow-xs transition-colors duration-fast hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {tl(M.backToQueue, locale)}
          </Link>
        }
      />
    </AdminAppShell>
  );
}
