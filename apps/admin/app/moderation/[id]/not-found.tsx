/**
 * Not-found surface for a listing that doesn't exist (or was already handled).
 * Rendered when the detail page calls `notFound()`.
 */

import { dir } from '@dyafa/i18n';
import { resolveLocale } from '../../../lib/i18n';
import { M, tl } from '../../../lib/moderation-i18n';

export default function ListingNotFound() {
  const locale = resolveLocale();
  const direction = dir(locale);
  return (
    <main dir={direction} className="min-h-screen bg-bg">
      <header className="sticky top-0 z-header bg-primary px-xl py-md flex items-center shadow-card">
        <span className="font-display text-heading-3 font-semibold text-text-on-primary">
          {tl(M.brand, locale)}
        </span>
      </header>
      <div className="max-w-screen-md mx-auto px-xl py-3xl flex flex-col items-center text-center gap-sm">
        <span className="font-display text-heading-1 font-semibold text-primary">
          {tl(M.notFoundTitle, locale)}
        </span>
        <p className="text-body-sm text-text-muted max-w-md">{tl(M.notFoundBody, locale)}</p>
        <a
          href="/moderation"
          className="mt-md rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-md hover:opacity-90 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {tl(M.backToQueue, locale)}
        </a>
      </div>
    </main>
  );
}
