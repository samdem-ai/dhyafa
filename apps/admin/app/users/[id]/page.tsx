/**
 * User profile — identity, verification, account actions, booking history.
 *
 * Server Component, gated by `requireAdmin()`. Loads the profile, the optional
 * host_profile (verification + payout info), and the user's bookings as a guest
 * (most-recent first) with property title + status.
 */

import { notFound } from 'next/navigation';
import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import { formatDZD } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import {
  BOOKING_STATUS,
  C,
  formatDate,
  formatDateTime,
  localized,
  statusOf,
  tl,
  VERIFICATION_STATUS,
} from '../../../lib/admin-i18n';
import { AdminAppShell } from '../../../components/AdminAppShell';
import { SectionCard, MetaRow, StatusPill, TableShell, Th, EmptyState } from '../../../components/ui';
import { UserActionsPanel } from './UserActionsPanel';

export const dynamic = 'force-dynamic';

const T = {
  profile: { ar: 'الملف الشخصي', fr: 'Profil', en: 'Profile' },
  host: { ar: 'حساب المضيف', fr: 'Compte hôte', en: 'Host account' },
  bookings: { ar: 'حجوزات الضيف', fr: 'Réservations', en: 'Bookings' },
  phone: { ar: 'الهاتف', fr: 'Téléphone', en: 'Phone' },
  phoneVerified: { ar: 'الهاتف مُتحقَّق', fr: 'Téléphone vérifié', en: 'Phone verified' },
  joined: { ar: 'انضم في', fr: 'Inscrit le', en: 'Joined' },
  locale: { ar: 'اللغة المفضّلة', fr: 'Langue préférée', en: 'Preferred locale' },
  accountStatus: { ar: 'حالة الحساب', fr: 'Statut du compte', en: 'Account status' },
  active: { ar: 'نشط', fr: 'Actif', en: 'Active' },
  suspended: { ar: 'معلّق', fr: 'Suspendu', en: 'Suspended' },
  legalName: { ar: 'الاسم القانوني', fr: 'Nom légal', en: 'Legal name' },
  hostKind: { ar: 'نوع المضيف', fr: 'Type d’hôte', en: 'Host kind' },
  identity: { ar: 'التحقق من الهوية', fr: 'Vérification', en: 'Identity' },
  payoutRib: { ar: 'حساب الدفع (RIB)', fr: 'RIB de paiement', en: 'Payout RIB' },
  colCode: { ar: 'الرمز', fr: 'Code', en: 'Code' },
  colProperty: { ar: 'العقار', fr: 'Logement', en: 'Property' },
  colDates: { ar: 'التواريخ', fr: 'Dates', en: 'Dates' },
  colTotal: { ar: 'الإجمالي', fr: 'Total', en: 'Total' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  noBookings: { ar: 'لا توجد حجوزات', fr: 'Aucune réservation', en: 'No bookings' },
} as const;

interface BookingRow {
  id: string;
  code: string;
  check_in: string;
  check_out: string;
  total_dzd: number;
  status: string;
  created_at: string;
  properties: { title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  await requireAdmin(`/users/${params.id}`);
  const locale: Locale = resolveLocale();

  const { data: profile, error } = await adminSupabase
    .from('profiles')
    .select('id, display_name, full_name, phone_e164, phone_verified_at, preferred_locale, is_active, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !profile) {
    if (error) {
      return (
        <AdminAppShell locale={locale}>
          <div role="alert" className="rounded-card bg-error-bg text-error px-xl py-lg">
            {tl(C.errorTitle, locale)} — {error.message}
          </div>
        </AdminAppShell>
      );
    }
    notFound();
  }

  const { data: host } = await adminSupabase
    .from('host_profiles')
    .select('id, display_name, legal_name, kind, identity_status, payout_rib, payout_status')
    .eq('owner_id', params.id)
    .maybeSingle();

  const { data: bookingsData } = await adminSupabase
    .from('bookings')
    .select('id, code, check_in, check_out, total_dzd, status, created_at, properties ( title_ar, title_fr, title_en )')
    .eq('guest_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const bookings = (bookingsData ?? []) as unknown as BookingRow[];

  const accountPill = profile.is_active
    ? { text: tl(T.active, locale), tone: 'success' as const }
    : { text: tl(T.suspended, locale), tone: 'error' as const };

  return (
    <AdminAppShell locale={locale}>
      <section className="flex items-center justify-between gap-md flex-wrap">
        <div className="flex flex-col gap-xs">
          <a href="/users" className="text-body-sm text-primary hover:underline">
            {tl(C.back, locale)}
          </a>
          <h1 className="font-display text-display-lg font-semibold text-primary">
            {profile.display_name}
          </h1>
        </div>
        <StatusPill {...accountPill} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-xl items-start">
        {/* Main column */}
        <div className="flex flex-col gap-xl">
          <SectionCard title={tl(T.profile, locale)}>
            <div className="flex flex-col">
              <MetaRow
                label={tl(C.guest, locale)}
                value={profile.full_name ?? profile.display_name}
              />
              <MetaRow label={tl(T.phone, locale)} value={<span dir="ltr">{profile.phone_e164 ?? '—'}</span>} />
              <MetaRow
                label={tl(T.phoneVerified, locale)}
                value={profile.phone_verified_at ? formatDate(profile.phone_verified_at, locale) : tl(C.no, locale)}
              />
              <MetaRow label={tl(T.locale, locale)} value={profile.preferred_locale} />
              <MetaRow label={tl(T.joined, locale)} value={formatDate(profile.created_at, locale)} />
              <MetaRow label={tl(T.accountStatus, locale)} value={<StatusPill {...accountPill} />} />
            </div>
          </SectionCard>

          {host && (
            <SectionCard title={tl(T.host, locale)}>
              <div className="flex flex-col">
                <MetaRow label={tl(C.host, locale)} value={host.display_name} />
                {host.legal_name && <MetaRow label={tl(T.legalName, locale)} value={host.legal_name} />}
                <MetaRow label={tl(T.hostKind, locale)} value={host.kind} />
                <MetaRow
                  label={tl(T.identity, locale)}
                  value={<StatusPill {...statusOf(VERIFICATION_STATUS, host.identity_status, locale)} />}
                />
                {host.payout_rib && (
                  <MetaRow label={tl(T.payoutRib, locale)} value={<span dir="ltr">{host.payout_rib}</span>} />
                )}
              </div>
            </SectionCard>
          )}

          <section>
            <h2 className="font-display text-heading-2 font-semibold text-primary mb-md">
              {tl(T.bookings, locale)}
            </h2>
            {bookings.length === 0 ? (
              <EmptyState locale={locale} title={tl(T.noBookings, locale)} body=" " />
            ) : (
              <TableShell>
                <div className="hidden md:grid grid-cols-[1fr_2fr_1.4fr_1fr_1fr] gap-md px-xl py-md border-b border-border">
                  <Th>{tl(T.colCode, locale)}</Th>
                  <Th>{tl(T.colProperty, locale)}</Th>
                  <Th>{tl(T.colDates, locale)}</Th>
                  <Th className="text-end">{tl(T.colTotal, locale)}</Th>
                  <Th className="text-end">{tl(T.colStatus, locale)}</Th>
                </div>
                <ul>
                  {bookings.map((b) => {
                    const title =
                      localized(
                        {
                          ar: b.properties?.title_ar ?? null,
                          fr: b.properties?.title_fr ?? null,
                          en: b.properties?.title_en ?? null,
                        },
                        locale,
                      ) ?? '—';
                    return (
                      <li key={b.id} className="border-b border-border last:border-0">
                        <a
                          href={`/bookings/${b.id}`}
                          className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1.4fr_1fr_1fr] gap-xs md:gap-md px-xl py-md hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset items-center"
                        >
                          <span className="text-body-sm font-semibold text-text-default tabular-nums" dir="ltr">
                            {b.code}
                          </span>
                          <span className="text-body-sm text-text-default truncate">{title}</span>
                          <span className="text-body-sm text-text-muted tabular-nums">
                            {formatDate(b.check_in, locale)} → {formatDate(b.check_out, locale)}
                          </span>
                          <span className="text-body-sm text-text-default md:text-end">
                            <bdi className="tabular-nums">{formatDZD(b.total_dzd, locale)}</bdi>
                          </span>
                          <span className="md:text-end">
                            <StatusPill {...statusOf(BOOKING_STATUS, b.status, locale)} />
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </TableShell>
            )}
          </section>
        </div>

        {/* Side column: actions */}
        <aside className="flex flex-col gap-xl lg:sticky lg:top-[112px]">
          <UserActionsPanel
            userId={profile.id}
            isActive={profile.is_active}
            hostProfileId={host?.id ?? null}
            identityStatus={host?.identity_status ?? null}
            locale={locale}
          />
        </aside>
      </div>
    </AdminAppShell>
  );
}
