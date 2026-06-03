/**
 * Reviews — guest reviews for the host's properties, with one reply each.
 *
 * Server Component (RLS-scoped). Each review shows the star rating, comment,
 * author, property, and either the existing host reply or a reply form.
 * Replying requires manager/owner (the RPC enforces this); reception sees the
 * list read-only.
 */

import { requireHost, canManage } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { type Locale } from '@dyafa/i18n';
import { T, tl, formatDate, localizedField } from '../../../lib/dashboard-i18n';
import { PageHeader, EmptyState, ErrorState } from '../../../components/ui';
import { ReviewReply } from './ReviewReply';

export const dynamic = 'force-dynamic';

interface ReviewRow {
  id: string;
  overall: number;
  comment_text: string | null;
  created_at: string;
  author_id: string;
  property_id: string;
  review_replies: { id: string; body: string; created_at: string }[] | null;
}

/** Render N filled + (5−N) empty stars (terracotta, never yellow). */
function Stars({ value, label }: { value: number; label: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-px" role="img" aria-label={`${label}: ${filled}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden className={i < filled ? 'text-rating-star' : 'text-border-strong'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function ReviewsPage() {
  const session = await requireHost('/reviews');
  const locale: Locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);
  const manage = canManage(session);

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, overall, comment_text, created_at, author_id, property_id,
       review_replies ( id, body, created_at )`,
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as ReviewRow[];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const propIds = Array.from(new Set(rows.map((r) => r.property_id)));
  const [authorsRes, propsRes] = await Promise.all([
    authorIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', authorIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    propIds.length
      ? supabase.from('properties').select('id, title_ar, title_fr, title_en').in('id', propIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title_ar: string | null;
            title_fr: string | null;
            title_en: string | null;
          }[],
        }),
  ]);

  const authorName = new Map(
    ((authorsRes.data ?? []) as { id: string; display_name: string }[]).map((a) => [
      a.id,
      a.display_name,
    ]),
  );
  const propTitle = new Map(
    (
      (propsRes.data ?? []) as {
        id: string;
        title_ar: string | null;
        title_fr: string | null;
        title_en: string | null;
      }[]
    ).map((p) => [
      p.id,
      localizedField({ ar: p.title_ar, fr: p.title_fr, en: p.title_en }, locale) ?? '—',
    ]),
  );

  return (
    <>
      <PageHeader title={tl(T.revTitle, locale)} subtitle={tl(T.revSubtitle, locale)} />

      {error && <ErrorState title={tl(T.errorTitle, locale)} message={error.message} />}

      {!error && rows.length === 0 && (
        <EmptyState title={tl(T.revTitle, locale)} body={tl(T.revEmpty, locale)} />
      )}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-md">
          {rows.map((r) => {
            const reply = r.review_replies?.[0] ?? null;
            return (
              <li key={r.id} className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md">
                <div className="flex flex-col gap-xs sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-xs">
                    <span className="text-title font-semibold text-text-default">
                      {authorName.get(r.author_id) ?? tl(T.msgGuest, locale)}
                    </span>
                    <span className="text-body-sm text-text-muted">
                      {propTitle.get(r.property_id) ?? '—'} · {formatDate(r.created_at, locale)}
                    </span>
                  </div>
                  <Stars value={r.overall} label={tl(T.revOverall, locale)} />
                </div>

                {r.comment_text && (
                  <p className="text-body text-text-default whitespace-pre-line leading-relaxed">
                    {r.comment_text}
                  </p>
                )}

                {reply ? (
                  <div className="rounded-md bg-surface-sunken px-md py-sm border-s-2 border-accent">
                    <span className="text-caption font-semibold text-text-muted">
                      {tl(T.revYourReply, locale)} · {formatDate(reply.created_at, locale)}
                    </span>
                    <p className="text-body-sm text-text-default whitespace-pre-line mt-xs">
                      {reply.body}
                    </p>
                  </div>
                ) : manage ? (
                  <ReviewReply reviewId={r.id} locale={locale} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
