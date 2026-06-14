/**
 * Reviews moderation.
 *
 * Server Component, gated by `requireAdmin()`. Two tabs (?tab=):
 *   • reported — reviews flagged by users; reports arrive as `disputes` with
 *     category 'other'. We load those disputes and join the review on the shared
 *     booking_id (reviews are 1:1 with bookings).
 *   • all — every review, filterable by status (?status=).
 * Each card exposes hide / remove / restore controls.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import {
  C,
  formatDate,
  formatInt,
  localized,
  REVIEW_STATUS,
  statusOf,
  tl,
} from '../../lib/admin-i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { PageHeader, StatusPill, EmptyState, ErrorState } from '../../components/ui';
import { FilterSelect, type FilterOption } from '../../components/FilterSelect';
import { ReviewModeration } from './ReviewModeration';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 40;

const T = {
  title: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
  subtitle: {
    ar: 'مراجعة التقييمات والإبلاغات',
    fr: 'Modération des avis et signalements',
    en: 'Moderate reviews and reports',
  },
  tabReported: { ar: 'المُبلَّغ عنها', fr: 'Signalés', en: 'Reported' },
  tabAll: { ar: 'كل التقييمات', fr: 'Tous les avis', en: 'All reviews' },
  statusAll: { ar: 'كل الحالات', fr: 'Tous les statuts', en: 'All statuses' },
  rating: { ar: 'التقييم', fr: 'Note', en: 'Rating' },
  reportReason: { ar: 'سبب الإبلاغ', fr: 'Motif du signalement', en: 'Report reason' },
  noComment: { ar: '— بدون تعليق', fr: '— sans commentaire', en: '— no comment' },
  emptyReported: {
    ar: 'لا توجد تقييمات مُبلَّغ عنها.',
    fr: 'Aucun avis signalé.',
    en: 'No reported reviews.',
  },
} as const;

const REVIEW_STATUS_KEYS = ['pending', 'published', 'hidden', 'removed'] as const;

interface ReviewRow {
  id: string;
  overall: number;
  comment_text: string | null;
  status: string;
  created_at: string;
  booking_id: string;
  author: { display_name: string } | null;
  properties: { id: string; title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
}

interface DisputeReportRow {
  id: string;
  booking_id: string;
  description: string | null;
  created_at: string;
}

function ReviewCard({
  review,
  locale,
  reportNote,
}: {
  review: ReviewRow;
  locale: Locale;
  reportNote?: string | null;
}) {
  const title =
    localized(
      {
        ar: review.properties?.title_ar ?? null,
        fr: review.properties?.title_fr ?? null,
        en: review.properties?.title_en ?? null,
      },
      locale,
    ) ?? '—';
  return (
    <li className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
      <div className="flex items-start justify-between gap-md flex-wrap">
        <div className="flex flex-col gap-xs min-w-0">
          <span className="text-title font-semibold text-text-default">
            {review.author?.display_name ?? '—'}
          </span>
          <span className="text-body-sm text-text-muted truncate">{title}</span>
        </div>
        <div className="flex items-center gap-md">
          <span className="rounded-pill bg-bone-300 text-text-default text-caption font-semibold px-md py-xs tabular-nums">
            ★ {formatInt(review.overall, locale)}
          </span>
          <StatusPill {...statusOf(REVIEW_STATUS, review.status, locale)} />
        </div>
      </div>

      <p className="text-body text-text-default whitespace-pre-line">
        {review.comment_text ?? <span className="italic text-text-muted">{tl(T.noComment, locale)}</span>}
      </p>

      {reportNote && (
        <div className="rounded-md bg-warning-bg text-warning text-body-sm px-md py-sm">
          {tl(T.reportReason, locale)}: {reportNote}
        </div>
      )}

      <div className="flex items-center justify-between gap-md flex-wrap">
        <span className="text-caption text-text-muted tabular-nums">
          {formatDate(review.created_at, locale)}
        </span>
        <ReviewModeration reviewId={review.id} status={review.status} locale={locale} />
      </div>
    </li>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string };
}) {
  await requireAdmin('/reviews');
  const locale: Locale = resolveLocale();
  const tab = searchParams.tab === 'all' ? 'all' : 'reported';
  const status = searchParams.status ?? null;

  const selectCols = `id, overall, comment_text, status, created_at, booking_id,
       author:profiles!reviews_author_id_fkey ( display_name ),
       properties ( id, title_ar, title_fr, title_en )`;

  let reviews: ReviewRow[] = [];
  const reportNoteByBooking = new Map<string, string | null>();
  let error: string | null = null;

  if (tab === 'reported') {
    // Reports arrive as disputes(category='other'). Pull recent ones, then load
    // the matching reviews by booking_id.
    const { data: disputeData, error: dErr } = await adminSupabase
      .from('disputes')
      .select('id, booking_id, description, created_at')
      .eq('category', 'other')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (dErr) error = dErr.message;

    const reports = (disputeData ?? []) as DisputeReportRow[];
    const bookingIds = reports.map((r) => r.booking_id);
    for (const r of reports) reportNoteByBooking.set(r.booking_id, r.description);

    if (bookingIds.length > 0) {
      const { data: revData, error: rErr } = await adminSupabase
        .from('reviews')
        .select(selectCols)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });
      if (rErr) error = error ?? rErr.message;
      reviews = (revData ?? []) as unknown as ReviewRow[];
    }
  } else {
    let q = adminSupabase
      .from('reviews')
      .select(selectCols)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (status && (REVIEW_STATUS_KEYS as readonly string[]).includes(status)) {
      q = q.eq('status', status as (typeof REVIEW_STATUS_KEYS)[number]);
    }
    const { data, error: rErr } = await q;
    if (rErr) error = rErr.message;
    reviews = (data ?? []) as unknown as ReviewRow[];
  }

  const statusOptions: FilterOption[] = REVIEW_STATUS_KEYS.map((k) => ({
    value: k,
    label: statusOf(REVIEW_STATUS, k, locale).text,
  }));

  const tabCls = (active: boolean): string =>
    `px-lg py-sm text-body-sm font-semibold rounded-md transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${
      active ? 'bg-primary text-text-on-primary' : 'bg-surface text-text-muted hover:text-text-default'
    }`;

  return (
    <AdminAppShell locale={locale}>
      <PageHeader title={tl(T.title, locale)} subtitle={tl(T.subtitle, locale)} />

      {/* Tabs + (all-tab) status filter */}
      <section className="flex items-center justify-between gap-md flex-wrap">
        <div className="inline-flex items-center gap-xs">
          <a href="/reviews?tab=reported" className={tabCls(tab === 'reported')}>
            {tl(T.tabReported, locale)}
          </a>
          <a href="/reviews?tab=all" className={tabCls(tab === 'all')}>
            {tl(T.tabAll, locale)}
          </a>
        </div>
        {tab === 'all' && (
          <FilterSelect
            paramKey="status"
            options={statusOptions}
            allLabel={tl(T.statusAll, locale)}
            current={status}
          />
        )}
      </section>

      {error && <ErrorState locale={locale} message={error} />}

      {!error && reviews.length === 0 && (
        <EmptyState
          locale={locale}
          title={tab === 'reported' ? tl(T.emptyReported, locale) : tl(C.emptyTitle, locale)}
          body=" "
        />
      )}

      {!error && reviews.length > 0 && (
        <ul className="flex flex-col gap-md">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              locale={locale}
              reportNote={tab === 'reported' ? reportNoteByBooking.get(r.booking_id) ?? null : null}
            />
          ))}
        </ul>
      )}
    </AdminAppShell>
  );
}
