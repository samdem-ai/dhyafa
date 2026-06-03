/**
 * Booking detail — full breakdown, payment/refund state, linked dispute, and
 * the admin force-cancel/refund action.
 *
 * Server Component, gated by `requireAdmin()`. Loads the booking with guest,
 * host, property, transactions, and any dispute on the booking.
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
  DISPUTE_STATUS,
  formatDate,
  formatDateTime,
  localized,
  statusOf,
  tl,
  TXN_STATUS,
} from '../../../lib/admin-i18n';
import { AdminShell } from '../../../components/AdminShell';
import { SectionCard, MetaRow, StatusPill } from '../../../components/ui';
import { CancelPanel } from './CancelPanel';

export const dynamic = 'force-dynamic';

const T = {
  summary: { ar: 'ملخص الحجز', fr: 'Résumé', en: 'Booking summary' },
  parties: { ar: 'الأطراف', fr: 'Parties', en: 'Parties' },
  breakdown: { ar: 'تفصيل المبلغ', fr: 'Détail du montant', en: 'Amount breakdown' },
  transactions: { ar: 'المعاملات', fr: 'Transactions', en: 'Transactions' },
  dispute: { ar: 'نزاع مرتبط', fr: 'Litige lié', en: 'Linked dispute' },
  property: { ar: 'العقار', fr: 'Logement', en: 'Property' },
  code: { ar: 'رمز الحجز', fr: 'Code', en: 'Code' },
  dates: { ar: 'التواريخ', fr: 'Dates', en: 'Dates' },
  nights: { ar: 'الليالي', fr: 'Nuits', en: 'Nights' },
  guests: { ar: 'الضيوف', fr: 'Voyageurs', en: 'Guests' },
  created: { ar: 'أُنشئ في', fr: 'Créé le', en: 'Created' },
  nightly: { ar: 'المبيت', fr: 'Hébergement', en: 'Nightly subtotal' },
  cleaning: { ar: 'رسوم التنظيف', fr: 'Frais de ménage', en: 'Cleaning fee' },
  serviceFee: { ar: 'رسوم الخدمة', fr: 'Frais de service', en: 'Service fee' },
  commission: { ar: 'العمولة', fr: 'Commission', en: 'Commission' },
  hostPayout: { ar: 'صافي المضيف', fr: 'Net hôte', en: 'Host payout' },
  total: { ar: 'الإجمالي', fr: 'Total', en: 'Total' },
  refunded: { ar: 'المُسترَد', fr: 'Remboursé', en: 'Refunded' },
  noTxns: { ar: 'لا توجد معاملات', fr: 'Aucune transaction', en: 'No transactions' },
  provider: { ar: 'المزوّد', fr: 'Fournisseur', en: 'Provider' },
  openDispute: { ar: 'فتح النزاع ←', fr: 'Ouvrir le litige →', en: 'Open dispute →' },
} as const;

interface TxnRow {
  id: string;
  kind: string;
  status: string;
  amount_dzd: number;
  refunded_dzd: number;
  provider: string;
  provider_ref: string | null;
  created_at: string;
}

interface DisputeRow {
  id: string;
  status: string;
  category: string;
}

interface BookingDetail {
  id: string;
  code: string;
  status: string;
  check_in: string;
  check_out: string;
  nights: number | null;
  adults: number;
  children: number;
  units: number;
  created_at: string;
  nightly_subtotal_dzd: number;
  cleaning_fee_dzd: number;
  service_fee_dzd: number;
  commission_amount_dzd: number;
  host_payout_dzd: number;
  total_dzd: number;
  refund_amount_dzd: number;
  cancellation_reason: string | null;
  guest: { id: string; display_name: string; phone_e164: string | null } | null;
  host_profiles: { id: string; display_name: string; owner_id: string } | null;
  properties: { id: string; title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
}

/** Booking statuses that can still be force-cancelled by an admin. */
const CANCELLABLE = new Set(['requested', 'awaiting_payment', 'confirmed', 'checked_in']);

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin(`/bookings/${params.id}`);
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('bookings')
    .select(
      `id, code, status, check_in, check_out, nights, adults, children, units, created_at,
       nightly_subtotal_dzd, cleaning_fee_dzd, service_fee_dzd, commission_amount_dzd,
       host_payout_dzd, total_dzd, refund_amount_dzd, cancellation_reason,
       guest:profiles!bookings_guest_id_fkey ( id, display_name, phone_e164 ),
       host_profiles ( id, display_name, owner_id ),
       properties ( id, title_ar, title_fr, title_en )`,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      return (
        <AdminShell locale={locale} pathname="/bookings">
          <div role="alert" className="rounded-card bg-error-bg text-error px-xl py-lg">
            {tl(C.errorTitle, locale)} — {error.message}
          </div>
        </AdminShell>
      );
    }
    notFound();
  }

  const b = data as unknown as BookingDetail;

  const { data: txnData } = await adminSupabase
    .from('transactions')
    .select('id, kind, status, amount_dzd, refunded_dzd, provider, provider_ref, created_at')
    .eq('booking_id', params.id)
    .order('created_at', { ascending: false });
  const txns = (txnData ?? []) as TxnRow[];

  const { data: disputeData } = await adminSupabase
    .from('disputes')
    .select('id, status, category')
    .eq('booking_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const dispute = disputeData as DisputeRow | null;

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
    <AdminShell locale={locale} pathname="/bookings">
      <section className="flex items-center justify-between gap-md flex-wrap">
        <div className="flex flex-col gap-xs">
          <a href="/bookings" className="text-body-sm text-primary hover:underline">
            {tl(C.back, locale)}
          </a>
          <h1 className="font-display text-display-lg font-semibold text-primary tabular-nums" dir="ltr">
            {b.code}
          </h1>
        </div>
        <StatusPill {...statusOf(BOOKING_STATUS, b.status, locale)} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-xl items-start">
        <div className="flex flex-col gap-xl">
          <SectionCard title={tl(T.summary, locale)}>
            <div className="flex flex-col">
              <MetaRow
                label={tl(T.property, locale)}
                value={
                  b.properties ? (
                    <a className="text-primary hover:underline" href={`/moderation/${b.properties.id}`}>
                      {title}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <MetaRow
                label={tl(T.dates, locale)}
                value={`${formatDate(b.check_in, locale)} → ${formatDate(b.check_out, locale)}`}
              />
              <MetaRow label={tl(T.nights, locale)} value={b.nights ?? '—'} />
              <MetaRow label={tl(T.guests, locale)} value={`${b.adults} + ${b.children}`} />
              <MetaRow label={tl(T.created, locale)} value={formatDateTime(b.created_at, locale)} />
              {b.cancellation_reason && (
                <MetaRow label={tl(C.reason, locale)} value={b.cancellation_reason} />
              )}
            </div>
          </SectionCard>

          <SectionCard title={tl(T.parties, locale)}>
            <div className="flex flex-col">
              <MetaRow
                label={tl(C.guest, locale)}
                value={
                  b.guest ? (
                    <a className="text-primary hover:underline" href={`/users/${b.guest.id}`}>
                      {b.guest.display_name}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <MetaRow
                label={tl(C.host, locale)}
                value={
                  b.host_profiles ? (
                    <a className="text-primary hover:underline" href={`/users/${b.host_profiles.owner_id}`}>
                      {b.host_profiles.display_name}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </div>
          </SectionCard>

          <SectionCard title={tl(T.breakdown, locale)}>
            <div className="flex flex-col">
              <MetaRow label={tl(T.nightly, locale)} value={<bdi className="tabular-nums">{formatDZD(b.nightly_subtotal_dzd, locale)}</bdi>} />
              <MetaRow label={tl(T.cleaning, locale)} value={<bdi className="tabular-nums">{formatDZD(b.cleaning_fee_dzd, locale)}</bdi>} />
              <MetaRow label={tl(T.serviceFee, locale)} value={<bdi className="tabular-nums">{formatDZD(b.service_fee_dzd, locale)}</bdi>} />
              <MetaRow label={tl(T.commission, locale)} value={<bdi className="tabular-nums">{formatDZD(b.commission_amount_dzd, locale)}</bdi>} />
              <MetaRow label={tl(T.hostPayout, locale)} value={<bdi className="tabular-nums">{formatDZD(b.host_payout_dzd, locale)}</bdi>} />
              <MetaRow
                label={tl(T.total, locale)}
                value={<bdi className="tabular-nums font-semibold text-accent">{formatDZD(b.total_dzd, locale)}</bdi>}
              />
              {b.refund_amount_dzd > 0 && (
                <MetaRow label={tl(T.refunded, locale)} value={<bdi className="tabular-nums">{formatDZD(b.refund_amount_dzd, locale)}</bdi>} />
              )}
            </div>
          </SectionCard>

          <SectionCard title={tl(T.transactions, locale)}>
            {txns.length === 0 ? (
              <p className="text-body-sm italic text-text-muted">{tl(T.noTxns, locale)}</p>
            ) : (
              <ul className="flex flex-col gap-sm">
                {txns.map((tx) => (
                  <li
                    key={tx.id}
                    className="rounded-md border border-border p-md flex items-center justify-between gap-md flex-wrap"
                  >
                    <div className="flex flex-col gap-xs">
                      <span className="text-body-sm font-semibold text-text-default">
                        {tx.kind} · {tx.provider}
                      </span>
                      <span className="text-caption text-text-muted tabular-nums">
                        {formatDateTime(tx.created_at, locale)}
                        {tx.provider_ref ? ` · ${tx.provider_ref}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-md">
                      <bdi className="text-body-sm font-semibold text-text-default tabular-nums">
                        {formatDZD(tx.amount_dzd, locale)}
                      </bdi>
                      <StatusPill {...statusOf(TXN_STATUS, tx.status, locale)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-xl lg:sticky lg:top-[112px]">
          <CancelPanel bookingId={b.id} cancellable={CANCELLABLE.has(b.status)} locale={locale} />

          {dispute && (
            <SectionCard title={tl(T.dispute, locale)}>
              <div className="flex flex-col gap-sm">
                <StatusPill {...statusOf(DISPUTE_STATUS, dispute.status, locale)} />
                <a href={`/disputes/${dispute.id}`} className="text-body-sm font-semibold text-accent hover:opacity-80">
                  {tl(T.openDispute, locale)}
                </a>
              </div>
            </SectionCard>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
