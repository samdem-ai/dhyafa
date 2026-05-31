/**
 * Listing review — full property detail with Approve / Reject actions.
 *
 * Server Component, gated by `requireAdmin()`. Loads the property and all
 * relations needed to make a moderation decision, builds public photo URLs from
 * the `listing-photos` bucket, and renders the review surface + DecisionPanel.
 */

import { notFound } from 'next/navigation';
import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import { photoPublicUrl } from '../../../lib/storage';
import { dir, formatDZD } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { M, tl, localizedField, formatDateTime } from '../../../lib/moderation-i18n';
import { DecisionPanel } from './DecisionPanel';

export const dynamic = 'force-dynamic';

// ── Query result shapes (joins flattened) ────────────────────────────────────
interface RoomTypeRow {
  id: string;
  name_ar: string | null;
  name_fr: string | null;
  name_en: string | null;
  max_occupancy: number | null;
  base_price_dzd: number | null;
  weekend_price_dzd: number | null;
  cleaning_fee_dzd: number | null;
  inventory_count: number | null;
  is_default: boolean | null;
}
interface PhotoRow {
  id: string;
  storage_path: string;
  is_cover: boolean | null;
  sort_order: number | null;
}
interface AmenityJoinRow {
  amenities: {
    id: number;
    name_ar: string | null;
    name_fr: string | null;
    name_en: string | null;
    icon: string | null;
    category: string | null;
  } | null;
}
interface PropertyDetail {
  id: string;
  status: string;
  listing_kind: string | null;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  house_rules_ar: string | null;
  house_rules_fr: string | null;
  house_rules_en: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  cancellation_tier: string | null;
  instant_book: boolean | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  submitted_at: string | null;
  created_at: string;
  host_profiles: {
    id: string;
    display_name: string | null;
    kind: string | null;
    identity_status: string | null;
  } | null;
  wilayas: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  communes: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  property_types: { name_ar: string | null; name_fr: string | null; name_en: string | null } | null;
  room_types: RoomTypeRow[] | null;
  property_photos: PhotoRow[] | null;
  property_amenities: AmenityJoinRow[] | null;
}

// ── Small presentational helpers ─────────────────────────────────────────────
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
      <h2 className="font-display text-heading-2 font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

function LocaleBlock({
  langLabel,
  value,
  notProvided,
}: {
  langLabel: string;
  value: string | null;
  notProvided: string;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
        {langLabel}
      </span>
      {value ? (
        <p className="text-body text-text-default whitespace-pre-line">{value}</p>
      ) : (
        <p className="text-body-sm italic text-text-muted">{notProvided}</p>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-md py-sm border-b border-border last:border-0">
      <span className="text-body-sm text-text-muted">{label}</span>
      <span className="text-body-sm font-medium text-text-default text-end">{value}</span>
    </div>
  );
}

export default async function ListingReviewPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin(`/moderation/${params.id}`);
  const locale = resolveLocale();
  const direction = dir(locale);

  const { data, error } = await adminSupabase
    .from('properties')
    .select(
      `id, status, listing_kind,
       title_ar, title_fr, title_en,
       description_ar, description_fr, description_en,
       house_rules_ar, house_rules_fr, house_rules_en,
       checkin_time, checkout_time, cancellation_tier, instant_book,
       address_line, lat, lng, submitted_at, created_at,
       host_profiles ( id, display_name, kind, identity_status ),
       wilayas ( name_ar, name_fr, name_en ),
       communes ( name_ar, name_fr, name_en ),
       property_types ( name_ar, name_fr, name_en ),
       room_types ( id, name_ar, name_fr, name_en, max_occupancy, base_price_dzd, weekend_price_dzd, cleaning_fee_dzd, inventory_count, is_default ),
       property_photos ( id, storage_path, is_cover, sort_order ),
       property_amenities ( amenities ( id, name_ar, name_fr, name_en, icon, category ) )`,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      return (
        <ReviewError locale={locale} direction={direction} message={error.message} />
      );
    }
    notFound();
  }

  const p = data as unknown as PropertyDetail;

  const title =
    localizedField({ ar: p.title_ar, fr: p.title_fr, en: p.title_en }, locale) ??
    tl(M.untitled, locale);

  // Photos: cover first, then by sort_order.
  const photos = [...(p.property_photos ?? [])].sort((a, b) => {
    if ((b.is_cover ? 1 : 0) !== (a.is_cover ? 1 : 0)) {
      return (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0);
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const wilaya =
    localizedField(
      {
        ar: p.wilayas?.name_ar ?? null,
        fr: p.wilayas?.name_fr ?? null,
        en: p.wilayas?.name_en ?? null,
      },
      locale,
    ) ?? '—';
  const commune = localizedField(
    {
      ar: p.communes?.name_ar ?? null,
      fr: p.communes?.name_fr ?? null,
      en: p.communes?.name_en ?? null,
    },
    locale,
  );
  const propertyType =
    localizedField(
      {
        ar: p.property_types?.name_ar ?? null,
        fr: p.property_types?.name_fr ?? null,
        en: p.property_types?.name_en ?? null,
      },
      locale,
    ) ?? '—';

  const amenities = (p.property_amenities ?? [])
    .map((row) => row.amenities)
    .filter((a): a is NonNullable<AmenityJoinRow['amenities']> => a !== null);

  const rooms = p.room_types ?? [];

  const yesNo = (v: boolean | null | undefined): string =>
    v
      ? locale === 'ar'
        ? 'نعم'
        : locale === 'fr'
          ? 'Oui'
          : 'Yes'
      : locale === 'ar'
        ? 'لا'
        : locale === 'fr'
          ? 'Non'
          : 'No';

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
          href="/moderation"
          className="text-body-sm text-teal-200 hover:text-text-on-primary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
        >
          {tl(M.backToQueue, locale)}
        </a>
      </header>

      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-xl">
        {/* ── Title row ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-xs">
          <div className="flex items-center gap-md flex-wrap">
            <h1 className="font-display text-display-lg font-semibold text-primary">{title}</h1>
            <span className="rounded-pill bg-warning-bg text-warning text-caption font-semibold px-md py-xs">
              {tl(M.pendingBadge, locale)}
            </span>
          </div>
          <p className="text-body-sm text-text-muted">
            {propertyType} · {wilaya}
            {commune ? ` · ${commune}` : ''} ·{' '}
            <span className="tabular-nums">
              {tl(M.submittedAt, locale)} {formatDateTime(p.submitted_at ?? p.created_at, locale)}
            </span>
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-xl items-start">
          {/* ── Main column ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-xl">
            {/* Photo gallery */}
            <SectionCard title={`${tl(M.photos, locale)} (${photos.length})`}>
              {photos.length === 0 ? (
                <p className="text-body-sm italic text-text-muted">{tl(M.noPhotos, locale)}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                  {photos.map((photo) => {
                    const url = photoPublicUrl(photo.storage_path);
                    return (
                      <div
                        key={photo.id}
                        className="relative aspect-[4/3] rounded-md overflow-hidden bg-surface-sunken"
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-caption text-text-muted">
                            —
                          </div>
                        )}
                        {photo.is_cover && (
                          <span className="absolute top-xs start-xs rounded-pill bg-primary/90 text-text-on-primary text-overline font-semibold px-sm py-[2px]">
                            {locale === 'ar' ? 'الغلاف' : locale === 'fr' ? 'Couverture' : 'Cover'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Titles (all locales) */}
            <SectionCard title={tl(M.titlesSection, locale)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                <LocaleBlock langLabel={tl(M.langAr, locale)} value={p.title_ar} notProvided={tl(M.notProvided, locale)} />
                <LocaleBlock langLabel={tl(M.langFr, locale)} value={p.title_fr} notProvided={tl(M.notProvided, locale)} />
                <LocaleBlock langLabel={tl(M.langEn, locale)} value={p.title_en} notProvided={tl(M.notProvided, locale)} />
              </div>
            </SectionCard>

            {/* Descriptions (all locales) */}
            <SectionCard title={tl(M.descriptionsSection, locale)}>
              <div className="grid grid-cols-1 gap-md">
                <LocaleBlock langLabel={tl(M.langAr, locale)} value={p.description_ar} notProvided={tl(M.notProvided, locale)} />
                <LocaleBlock langLabel={tl(M.langFr, locale)} value={p.description_fr} notProvided={tl(M.notProvided, locale)} />
                <LocaleBlock langLabel={tl(M.langEn, locale)} value={p.description_en} notProvided={tl(M.notProvided, locale)} />
              </div>
            </SectionCard>

            {/* Room types */}
            <SectionCard title={`${tl(M.roomTypes, locale)} (${rooms.length})`}>
              {rooms.length === 0 ? (
                <p className="text-body-sm italic text-text-muted">{tl(M.noRoomTypes, locale)}</p>
              ) : (
                <ul className="flex flex-col gap-md">
                  {rooms.map((room) => {
                    const roomName =
                      localizedField(
                        { ar: room.name_ar, fr: room.name_fr, en: room.name_en },
                        locale,
                      ) ?? tl(M.untitled, locale);
                    return (
                      <li
                        key={room.id}
                        className="rounded-md border border-border p-md flex flex-col gap-sm"
                      >
                        <div className="flex items-center gap-sm flex-wrap">
                          <span className="text-title font-semibold text-text-default">
                            {roomName}
                          </span>
                          {room.is_default && (
                            <span className="rounded-pill bg-info-bg text-info text-overline font-semibold px-sm py-[2px]">
                              {locale === 'ar' ? 'افتراضي' : locale === 'fr' ? 'Par défaut' : 'Default'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-xl gap-y-xs">
                          <span className="text-body-sm text-text-default">
                            <bdi className="font-semibold text-accent tabular-nums">
                              {formatDZD(room.base_price_dzd ?? 0, locale)}
                            </bdi>{' '}
                            <span className="text-text-muted">{tl(M.perNight, locale)}</span>
                          </span>
                          {room.weekend_price_dzd != null && (
                            <span className="text-body-sm text-text-muted">
                              {tl(M.weekend, locale)}:{' '}
                              <bdi className="tabular-nums text-text-default">
                                {formatDZD(room.weekend_price_dzd, locale)}
                              </bdi>
                            </span>
                          )}
                          <span className="text-body-sm text-text-muted">
                            {tl(M.cleaningFee, locale)}:{' '}
                            <bdi className="tabular-nums text-text-default">
                              {formatDZD(room.cleaning_fee_dzd ?? 0, locale)}
                            </bdi>
                          </span>
                          <span className="text-body-sm text-text-muted">
                            {tl(M.maxOccupancy, locale)}:{' '}
                            <span className="tabular-nums text-text-default">
                              {room.max_occupancy ?? '—'}
                            </span>{' '}
                            {tl(M.guests, locale)}
                          </span>
                          <span className="text-body-sm text-text-muted">
                            {tl(M.inventory, locale)}:{' '}
                            <span className="tabular-nums text-text-default">
                              {room.inventory_count ?? '—'}
                            </span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            {/* Amenities */}
            <SectionCard title={`${tl(M.amenities, locale)} (${amenities.length})`}>
              {amenities.length === 0 ? (
                <p className="text-body-sm italic text-text-muted">{tl(M.noAmenities, locale)}</p>
              ) : (
                <ul className="flex flex-wrap gap-sm">
                  {amenities.map((a) => {
                    const name =
                      localizedField(
                        { ar: a.name_ar, fr: a.name_fr, en: a.name_en },
                        locale,
                      ) ?? a.icon ?? '—';
                    return (
                      <li
                        key={a.id}
                        className="rounded-pill bg-bone-300 text-body-sm text-text-default px-md py-xs"
                      >
                        {name}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            {/* House rules */}
            <SectionCard title={tl(M.houseRules, locale)}>
              <div className="grid grid-cols-1 gap-md">
                <LocaleBlock langLabel={tl(M.langAr, locale)} value={p.house_rules_ar} notProvided={tl(M.notProvided, locale)} />
                <LocaleBlock langLabel={tl(M.langFr, locale)} value={p.house_rules_fr} notProvided={tl(M.notProvided, locale)} />
                <LocaleBlock langLabel={tl(M.langEn, locale)} value={p.house_rules_en} notProvided={tl(M.notProvided, locale)} />
              </div>
            </SectionCard>
          </div>

          {/* ── Side column (sticky): host, location, meta, decision ──────── */}
          <aside className="flex flex-col gap-xl lg:sticky lg:top-[88px]">
            <DecisionPanel propertyId={p.id} locale={locale} />

            <SectionCard title={tl(M.hostInfo, locale)}>
              <div className="flex flex-col">
                <MetaRow
                  label={tl(M.colHost, locale)}
                  value={p.host_profiles?.display_name ?? tl(M.unknownHost, locale)}
                />
                <MetaRow
                  label={locale === 'ar' ? 'النوع' : locale === 'fr' ? 'Type' : 'Kind'}
                  value={p.host_profiles?.kind ?? '—'}
                />
                <MetaRow
                  label={tl(M.identityStatus, locale)}
                  value={p.host_profiles?.identity_status ?? '—'}
                />
              </div>
            </SectionCard>

            <SectionCard title={tl(M.location, locale)}>
              <div className="flex flex-col">
                <MetaRow label={tl(M.colWilaya, locale)} value={wilaya} />
                {commune && (
                  <MetaRow
                    label={locale === 'ar' ? 'البلدية' : locale === 'fr' ? 'Commune' : 'Commune'}
                    value={commune}
                  />
                )}
                {p.address_line && (
                  <MetaRow
                    label={locale === 'ar' ? 'العنوان' : locale === 'fr' ? 'Adresse' : 'Address'}
                    value={p.address_line}
                  />
                )}
                {p.lat != null && p.lng != null && (
                  <MetaRow
                    label={locale === 'ar' ? 'الإحداثيات' : locale === 'fr' ? 'Coordonnées' : 'Coordinates'}
                    value={`${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard title={locale === 'ar' ? 'تفاصيل أخرى' : locale === 'fr' ? 'Autres détails' : 'Other details'}>
              <div className="flex flex-col">
                <MetaRow label={tl(M.checkin, locale)} value={p.checkin_time ?? '—'} />
                <MetaRow label={tl(M.checkout, locale)} value={p.checkout_time ?? '—'} />
                <MetaRow label={tl(M.cancellation, locale)} value={p.cancellation_tier ?? '—'} />
                <MetaRow label={tl(M.instantBook, locale)} value={yesNo(p.instant_book)} />
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

// ── Inline error surface (DB read failed) ────────────────────────────────────
function ReviewError({
  locale,
  direction,
  message,
}: {
  locale: Locale;
  direction: 'rtl' | 'ltr';
  message: string;
}) {
  return (
    <main dir={direction} className="min-h-screen bg-bg">
      <div className="max-w-screen-md mx-auto px-xl py-3xl flex flex-col gap-md">
        <a href="/moderation" className="text-body-sm text-primary hover:underline">
          {tl(M.backToQueue, locale)}
        </a>
        <div role="alert" className="rounded-card bg-error-bg text-error px-xl py-lg">
          <p className="text-title font-semibold">{tl(M.errorTitle, locale)}</p>
          <p className="text-body-sm mt-xs">{message}</p>
        </div>
      </div>
    </main>
  );
}
