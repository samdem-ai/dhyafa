/**
 * Property detail / editor.
 *
 * Server Component (RLS-scoped). Shows the property header, photo gallery,
 * amenities, and a list of room types — each with an inline price/inventory
 * editor (manager/owner only). Reception sees read-only data.
 */

import { notFound } from 'next/navigation';
import { requireHost, canManage } from '../../../../lib/auth';
import { resolveLocale } from '../../../../lib/i18n';
import { createUserClient } from '../../../../lib/supabase/userServer';
import { photoPublicUrl } from '../../../../lib/storage';
import { describeBedConfig, formatRating } from '../../../../lib/format';
import { formatNumber } from '@dyafa/i18n';
import {
  T,
  tl,
  localizedField,
  propertyStatusLabel,
  propertyStatusColor,
} from '../../../../lib/dashboard-i18n';
import { PageHeader, Section, EmptyState, ErrorState, StatusPill } from '../../../../components/ui';
import { RoomTypeEditor } from './RoomTypeEditor';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

type Json = Database['public']['Tables']['room_types']['Row']['bed_config'];

interface PropertyDetail {
  id: string;
  status: Database['public']['Enums']['property_status'];
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  address_line: string | null;
  rating_avg: number;
  review_count: number;
  wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
}

interface RoomTypeRow {
  id: string;
  name_ar: string | null;
  name_fr: string | null;
  name_en: string | null;
  base_price_dzd: number;
  weekend_price_dzd: number | null;
  inventory_count: number;
  max_occupancy: number;
  cleaning_fee_dzd: number;
  bed_config: Json;
  sort_order: number | null;
}

interface PhotoRow {
  id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
}

interface AmenityJoinRow {
  amenities: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireHost(`/properties/${params.id}`);
  const locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);
  const editable = canManage(session);

  const { data: propData, error: propError } = await supabase
    .from('properties')
    .select(
      `id, status, title_ar, title_fr, title_en, description_ar, description_fr, description_en,
       address_line, rating_avg, review_count,
       wilayas ( name_ar, name_fr, name_en )`,
    )
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (propError) {
    return <ErrorState title={tl(T.errorTitle, locale)} message={propError.message} />;
  }
  if (!propData) notFound();
  const property = propData as unknown as PropertyDetail;

  const [roomsRes, photosRes, amenitiesRes] = await Promise.all([
    supabase
      .from('room_types')
      .select(
        'id, name_ar, name_fr, name_en, base_price_dzd, weekend_price_dzd, inventory_count, max_occupancy, cleaning_fee_dzd, bed_config, sort_order',
      )
      .eq('property_id', params.id)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('property_photos')
      .select('id, storage_path, is_cover, sort_order')
      .eq('property_id', params.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('property_amenities')
      .select('amenities ( name_ar, name_fr, name_en )')
      .eq('property_id', params.id),
  ]);

  const rooms = (roomsRes.data ?? []) as unknown as RoomTypeRow[];
  const photos = (photosRes.data ?? []) as PhotoRow[];
  const amenities = (amenitiesRes.data ?? []) as unknown as AmenityJoinRow[];

  const title =
    localizedField(
      { ar: property.title_ar, fr: property.title_fr, en: property.title_en },
      locale,
    ) ?? '—';
  const description = localizedField(
    { ar: property.description_ar, fr: property.description_fr, en: property.description_en },
    locale,
  );
  const wilaya = localizedField(
    {
      ar: property.wilayas?.name_ar ?? null,
      fr: property.wilayas?.name_fr ?? null,
      en: property.wilayas?.name_en ?? null,
    },
    locale,
  );

  return (
    <>
      <a
        href="/properties"
        className="text-body-sm font-medium text-text-muted hover:text-text-default transition-colors duration-fast"
      >
        {tl(T.back, locale)}
      </a>

      <PageHeader
        title={title}
        subtitle={
          [wilaya, property.address_line].filter(Boolean).join(' · ') || undefined
        }
        action={
          <StatusPill
            label={propertyStatusLabel(property.status, locale)}
            colorClass={propertyStatusColor(property.status)}
          />
        }
      />

      {property.review_count > 0 && (
        <div className="flex items-center gap-xs text-body-sm text-text-muted">
          <span aria-hidden className="text-rating-star">
            ★
          </span>
          <span className="tabular-nums">{formatRating(property.rating_avg, locale)}</span>
          <span>
            · {formatNumber(property.review_count, locale)} {tl(T.propReviews, locale)}
          </span>
        </div>
      )}

      {!editable && (
        <div className="rounded-md bg-info-bg text-info text-body-sm px-md py-sm">
          {tl(T.readOnlyNotice, locale)}
        </div>
      )}

      {/* Photos */}
      <Section title={tl(T.propPhotos, locale)}>
        {photos.length === 0 ? (
          <EmptyState title={tl(T.propPhotos, locale)} body={tl(T.none, locale)} />
        ) : (
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((ph) => {
              const url = photoPublicUrl(ph.storage_path);
              return (
                <div
                  key={ph.id}
                  className="aspect-[3/2] rounded-md overflow-hidden bg-surface-sunken relative"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  {ph.is_cover && (
                    <span className="absolute top-xs start-xs rounded-pill bg-primary/80 text-text-on-primary text-overline font-semibold px-sm py-px">
                      ★
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Description */}
      {description && (
        <Section title={tl(T.propTitle, locale)}>
          <p className="rounded-card bg-surface shadow-card p-lg text-body text-text-default whitespace-pre-line leading-relaxed">
            {description}
          </p>
        </Section>
      )}

      {/* Room types */}
      <Section
        title={tl(T.propRoomTypes, locale)}
        action={
          editable ? (
            <span className="text-caption text-text-muted max-w-xs text-end hidden sm:block">
              {tl(T.propEditHint, locale)}
            </span>
          ) : undefined
        }
      >
        {rooms.length === 0 ? (
          <EmptyState title={tl(T.propRoomTypes, locale)} body={tl(T.propNoRoomTypes, locale)} />
        ) : (
          <div className="flex flex-col gap-md">
            {rooms.map((rt) => (
              <RoomTypeEditor
                key={rt.id}
                locale={locale}
                canEdit={editable}
                roomType={{
                  id: rt.id,
                  propertyId: property.id,
                  name:
                    localizedField({ ar: rt.name_ar, fr: rt.name_fr, en: rt.name_en }, locale) ??
                    tl(T.propRoomTypes, locale),
                  basePriceDzd: rt.base_price_dzd,
                  weekendPriceDzd: rt.weekend_price_dzd,
                  inventoryCount: rt.inventory_count,
                  maxOccupancy: rt.max_occupancy,
                  cleaningFeeDzd: rt.cleaning_fee_dzd,
                  beds: describeBedConfig(rt.bed_config, locale),
                }}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Amenities */}
      <Section title={tl(T.propAmenities, locale)}>
        {amenities.length === 0 ? (
          <div className="rounded-card bg-surface shadow-card px-lg py-md text-body-sm text-text-muted">
            {tl(T.none, locale)}
          </div>
        ) : (
          <ul className="flex flex-wrap gap-sm">
            {amenities.map((a, i) => {
              const name = localizedField(
                {
                  ar: a.amenities?.name_ar ?? null,
                  fr: a.amenities?.name_fr ?? null,
                  en: a.amenities?.name_en ?? null,
                },
                locale,
              );
              if (!name) return null;
              return (
                <li
                  key={`${name}-${i}`}
                  className="rounded-pill bg-surface shadow-xs px-md py-xs text-body-sm text-text-default"
                >
                  {name}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
