/**
 * Properties list — all properties owned by the caller's host (RLS-scoped).
 *
 * Server Component. Each row links to the detail/editor page and shows status,
 * location (wilaya), room-type count and rating.
 */

import { requireHost } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { photoPublicUrl } from '../../../lib/storage';
import { formatRating } from '../../../lib/format';
import { formatNumber } from '@dyafa/i18n';
import {
  T,
  tl,
  localizedField,
  propertyStatusLabel,
  propertyStatusColor,
} from '../../../lib/dashboard-i18n';
import { PageHeader, EmptyState, ErrorState, StatusPill } from '../../../components/ui';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

interface PropertyListRow {
  id: string;
  status: Database['public']['Enums']['property_status'];
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  cover_photo_path: string | null;
  rating_avg: number;
  review_count: number;
  wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  room_types: { count: number }[] | null;
}

export default async function PropertiesPage() {
  const session = await requireHost('/properties');
  const locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);

  const { data, error } = await supabase
    .from('properties')
    .select(
      `id, status, title_ar, title_fr, title_en, cover_photo_path, rating_avg, review_count,
       wilayas ( name_ar, name_fr, name_en ),
       room_types ( count )`,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as PropertyListRow[];

  return (
    <>
      <PageHeader title={tl(T.propTitle, locale)} subtitle={tl(T.propSubtitle, locale)} />

      {error && <ErrorState title={tl(T.errorTitle, locale)} message={error.message} />}

      {!error && rows.length === 0 && (
        <EmptyState title={tl(T.propTitle, locale)} body={tl(T.propEmpty, locale)} />
      )}

      {!error && rows.length > 0 && (
        <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const title =
              localizedField({ ar: p.title_ar, fr: p.title_fr, en: p.title_en }, locale) ?? '—';
            const wilaya =
              localizedField(
                {
                  ar: p.wilayas?.name_ar ?? null,
                  fr: p.wilayas?.name_fr ?? null,
                  en: p.wilayas?.name_en ?? null,
                },
                locale,
              ) ?? '—';
            const roomCount = p.room_types?.[0]?.count ?? 0;
            const cover = photoPublicUrl(p.cover_photo_path);

            return (
              <li key={p.id}>
                <a
                  href={`/properties/${p.id}`}
                  className="group flex flex-col rounded-card bg-surface shadow-card overflow-hidden hover:shadow-raised transition-shadow duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
                >
                  <div className="aspect-[3/2] bg-surface-sunken relative">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-text-muted text-body-sm">
                        {tl(T.propPhotos, locale)}
                      </div>
                    )}
                    <span className="absolute top-sm end-sm">
                      <StatusPill
                        label={propertyStatusLabel(p.status, locale)}
                        colorClass={`${propertyStatusColor(p.status)} shadow-xs`}
                      />
                    </span>
                  </div>
                  <div className="flex flex-col gap-xs p-lg">
                    <span className="text-title font-semibold text-text-default line-clamp-1">
                      {title}
                    </span>
                    <span className="text-body-sm text-text-muted">{wilaya}</span>
                    <div className="flex items-center justify-between mt-xs text-body-sm text-text-muted">
                      <span>
                        {formatNumber(roomCount, locale)} {tl(T.propRoomTypes, locale)}
                      </span>
                      {p.review_count > 0 && (
                        <span className="flex items-center gap-xs">
                          <span aria-hidden className="text-rating-star">
                            ★
                          </span>
                          <span className="tabular-nums">{formatRating(p.rating_avg, locale)}</span>
                          <span>
                            ({formatNumber(p.review_count, locale)})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
