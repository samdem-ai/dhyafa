/**
 * Moderation queue — pending listings awaiting review.
 *
 * Server Component. Gated by `requireAdmin()` (redirects to /sign-in when the
 * caller is not a signed-in admin). Reads `properties` where status='pending',
 * newest `submitted_at` first, joining host / wilaya / type / photo-count.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import { dir } from '@dyafa/i18n';
import { M, tl, localizedField, formatDateTime } from '../../lib/moderation-i18n';

export const dynamic = 'force-dynamic';

/** Shape of a row returned by the pending-listings query (joins flattened). */
interface PendingRow {
  id: string;
  submitted_at: string | null;
  created_at: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  host_profiles: { display_name: string | null } | null;
  wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_types: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_photos: { count: number }[] | null;
}

export default async function ModerationQueuePage() {
  await requireAdmin('/moderation');
  const locale = resolveLocale();
  const direction = dir(locale);

  const { data, error } = await adminSupabase
    .from('properties')
    .select(
      `id, submitted_at, created_at, title_ar, title_fr, title_en,
       host_profiles ( display_name ),
       wilayas ( name_ar, name_fr, name_en ),
       property_types ( name_ar, name_fr, name_en ),
       property_photos ( count )`,
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false, nullsFirst: false });

  const rows = (data ?? []) as unknown as PendingRow[];

  return (
    <main dir={direction} className="min-h-screen bg-bg">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-header bg-primary px-xl py-md flex items-center justify-between shadow-card">
        <div className="flex items-center gap-md">
          <span className="font-display text-heading-3 font-semibold text-text-on-primary">
            {tl(M.brand, locale)}
          </span>
          <span className="text-body-sm text-teal-200">{tl(M.adminLabel, locale)}</span>
        </div>
        <a
          href="/"
          className="text-body-sm text-teal-200 hover:text-text-on-primary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
        >
          {tl(M.backToDashboard, locale)}
        </a>
      </header>

      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-xl">
        <section>
          <div className="flex items-center justify-between gap-md mb-xs">
            <h1 className="font-display text-heading-1 font-semibold text-primary">
              {tl(M.queueTitle, locale)}
            </h1>
            <span className="rounded-pill bg-accent text-text-on-primary text-caption font-semibold px-md py-xs tabular-nums">
              {rows.length}
            </span>
          </div>
          <p className="text-body-sm text-text-muted">{tl(M.queueSubtitle, locale)}</p>
        </section>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="rounded-card bg-error-bg text-error px-xl py-lg text-body-sm"
          >
            {tl(M.errorTitle, locale)} — {error.message}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!error && rows.length === 0 && (
          <div className="rounded-card bg-surface shadow-card px-xl py-3xl flex flex-col items-center text-center gap-sm">
            <span className="font-display text-heading-2 font-semibold text-primary">
              {tl(M.emptyTitle, locale)}
            </span>
            <p className="text-body-sm text-text-muted max-w-md">{tl(M.emptyBody, locale)}</p>
          </div>
        )}

        {/* ── Queue table ─────────────────────────────────────────────────── */}
        {!error && rows.length > 0 && (
          <div className="rounded-card bg-surface shadow-card overflow-hidden">
            {/* Column header (hidden on small screens) */}
            <div className="hidden md:grid grid-cols-[2fr_1.3fr_1fr_1fr_1.2fr_auto] gap-md px-xl py-md border-b border-border text-caption font-semibold uppercase tracking-wide text-text-muted">
              <span>{tl(M.colListing, locale)}</span>
              <span>{tl(M.colHost, locale)}</span>
              <span>{tl(M.colWilaya, locale)}</span>
              <span>{tl(M.colType, locale)}</span>
              <span>{tl(M.colSubmitted, locale)}</span>
              <span className="text-end">{tl(M.colPhotos, locale)}</span>
            </div>

            <ul>
              {rows.map((row) => {
                const title = localizedField(
                  { ar: row.title_ar, fr: row.title_fr, en: row.title_en },
                  locale,
                ) ?? tl(M.untitled, locale);
                const host = row.host_profiles?.display_name ?? tl(M.unknownHost, locale);
                const wilaya =
                  localizedField(
                    {
                      ar: row.wilayas?.name_ar ?? null,
                      fr: row.wilayas?.name_fr ?? null,
                      en: row.wilayas?.name_en ?? null,
                    },
                    locale,
                  ) ?? '—';
                const type =
                  localizedField(
                    {
                      ar: row.property_types?.name_ar ?? null,
                      fr: row.property_types?.name_fr ?? null,
                      en: row.property_types?.name_en ?? null,
                    },
                    locale,
                  ) ?? '—';
                const photoCount = row.property_photos?.[0]?.count ?? 0;

                return (
                  <li key={row.id} className="border-b border-border last:border-0">
                    <a
                      href={`/moderation/${row.id}`}
                      className="grid grid-cols-1 md:grid-cols-[2fr_1.3fr_1fr_1fr_1.2fr_auto] gap-xs md:gap-md px-xl py-md hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
                    >
                      <span className="text-title font-semibold text-text-default">
                        {title}
                      </span>
                      <span className="text-body-sm text-text-muted md:text-text-default">
                        {host}
                      </span>
                      <span className="text-body-sm text-text-muted md:text-text-default">
                        {wilaya}
                      </span>
                      <span className="text-body-sm text-text-muted md:text-text-default">
                        {type}
                      </span>
                      <span className="text-body-sm text-text-muted tabular-nums">
                        {formatDateTime(row.submitted_at ?? row.created_at, locale)}
                      </span>
                      <span className="text-body-sm text-text-muted md:text-end tabular-nums">
                        {photoCount}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
