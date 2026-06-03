/**
 * Payments & payouts oversight.
 *
 * Server Component, gated by `requireAdmin()`. Three sections:
 *   1. Commission breakdown KPIs (rolling totals from paid transactions).
 *   2. Transactions list — filter by status (?status=), record manual refunds.
 *   3. Payouts management — generate (run_payouts) + mark individual payouts paid.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import { formatDZD } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import {
  C,
  formatDate,
  formatDateTime,
  PAYOUT_STATUS,
  statusOf,
  tl,
  TXN_STATUS,
} from '../../lib/admin-i18n';
import { AdminShell } from '../../components/AdminShell';
import { SectionCard, StatusPill, TableShell, Th, EmptyState, ErrorState } from '../../components/ui';
import { FilterSelect, type FilterOption } from '../../components/FilterSelect';
import { RunPayoutsForm, MarkPaidButton, RefundButton } from './PaymentControls';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

const T = {
  title: { ar: 'المدفوعات', fr: 'Paiements', en: 'Payments' },
  subtitle: {
    ar: 'المعاملات والمستحقّات والعمولة',
    fr: 'Transactions, virements et commission',
    en: 'Transactions, payouts and commission',
  },
  gmvPaid: { ar: 'مدفوعات مُحصّلة', fr: 'Encaissé (payé)', en: 'Collected (paid)' },
  commission: { ar: 'إجمالي العمولة', fr: 'Commission totale', en: 'Total commission' },
  refunded: { ar: 'إجمالي المُسترَد', fr: 'Total remboursé', en: 'Total refunded' },
  txns: { ar: 'المعاملات', fr: 'Transactions', en: 'Transactions' },
  payouts: { ar: 'مستحقّات المضيفين', fr: 'Virements hôtes', en: 'Host payouts' },
  statusAll: { ar: 'كل الحالات', fr: 'Tous les statuts', en: 'All statuses' },
  colWhen: { ar: 'التاريخ', fr: 'Date', en: 'Date' },
  colBooking: { ar: 'الحجز', fr: 'Réservation', en: 'Booking' },
  colProvider: { ar: 'المزوّد', fr: 'Fournisseur', en: 'Provider' },
  colAmount: { ar: 'المبلغ', fr: 'Montant', en: 'Amount' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  colAction: { ar: 'إجراء', fr: 'Action', en: 'Action' },
  colHost: { ar: 'المضيف', fr: 'Hôte', en: 'Host' },
  colPeriod: { ar: 'الفترة', fr: 'Période', en: 'Period' },
  colNet: { ar: 'الصافي', fr: 'Net', en: 'Net' },
  noPayouts: { ar: 'لا توجد مستحقّات', fr: 'Aucun virement', en: 'No payouts' },
} as const;

interface TxnRow {
  id: string;
  kind: string;
  status: string;
  amount_dzd: number;
  commission_amount_dzd: number;
  refunded_dzd: number;
  provider: string;
  provider_ref: string | null;
  created_at: string;
  booking_id: string | null;
  bookings: { code: string } | null;
}

interface PayoutRow {
  id: string;
  status: string;
  gross_dzd: number;
  commission_amount_dzd: number;
  net_dzd: number;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  reference: string | null;
  host_profiles: { display_name: string } | null;
}

const TXN_STATUS_KEYS = [
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'expired',
] as const;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin('/payments');
  const locale: Locale = resolveLocale();
  const status = searchParams.status ?? null;

  // KPI aggregates from paid transactions (rolling, all-time for v1).
  const paidQuery = adminSupabase
    .from('transactions')
    .select('amount_dzd, commission_amount_dzd, refunded_dzd, status')
    .in('status', ['paid', 'partially_refunded', 'refunded']);

  let txnQuery = adminSupabase
    .from('transactions')
    .select(
      `id, kind, status, amount_dzd, commission_amount_dzd, refunded_dzd, provider, provider_ref,
       created_at, booking_id, bookings ( code )`,
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (status && (TXN_STATUS_KEYS as readonly string[]).includes(status)) {
    txnQuery = txnQuery.eq('status', status as (typeof TXN_STATUS_KEYS)[number]);
  }

  const payoutQuery = adminSupabase
    .from('payouts')
    .select(
      `id, status, gross_dzd, commission_amount_dzd, net_dzd, period_start, period_end, paid_at, reference,
       host_profiles ( display_name )`,
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  const [paidRes, txnRes, payoutRes] = await Promise.all([paidQuery, txnQuery, payoutQuery]);
  const error = paidRes.error ?? txnRes.error ?? payoutRes.error ?? null;

  const paidRows = (paidRes.data ?? []) as Pick<
    TxnRow,
    'amount_dzd' | 'commission_amount_dzd' | 'refunded_dzd'
  >[];
  const kpis = paidRows.reduce(
    (acc, t) => {
      acc.gmv += t.amount_dzd ?? 0;
      acc.commission += t.commission_amount_dzd ?? 0;
      acc.refunded += t.refunded_dzd ?? 0;
      return acc;
    },
    { gmv: 0, commission: 0, refunded: 0 },
  );

  const txns = (txnRes.data ?? []) as unknown as TxnRow[];
  const payouts = (payoutRes.data ?? []) as unknown as PayoutRow[];

  const statusOptions: FilterOption[] = TXN_STATUS_KEYS.map((k) => ({
    value: k,
    label: statusOf(TXN_STATUS, k, locale).text,
  }));

  return (
    <AdminShell locale={locale} pathname="/payments">
      <PageHeaderInline title={tl(T.title, locale)} subtitle={tl(T.subtitle, locale)} />

      {error && <ErrorState locale={locale} message={error.message} />}

      {/* ── Commission breakdown KPIs ───────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-lg sm:grid-cols-3">
        <Kpi label={tl(T.gmvPaid, locale)} value={formatDZD(kpis.gmv, locale)} accent />
        <Kpi label={tl(T.commission, locale)} value={formatDZD(kpis.commission, locale)} />
        <Kpi label={tl(T.refunded, locale)} value={formatDZD(kpis.refunded, locale)} />
      </section>

      {/* ── Payouts management ──────────────────────────────────────────── */}
      <SectionCard>
        <RunPayoutsForm locale={locale} />
      </SectionCard>

      <section>
        <h2 className="font-display text-heading-2 font-semibold text-primary mb-md">
          {tl(T.payouts, locale)}
        </h2>
        {payouts.length === 0 ? (
          <EmptyState locale={locale} title={tl(T.noPayouts, locale)} body=" " />
        ) : (
          <TableShell>
            <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1.4fr] gap-md px-xl py-md border-b border-border">
              <Th>{tl(T.colHost, locale)}</Th>
              <Th>{tl(T.colPeriod, locale)}</Th>
              <Th className="text-end">{tl(T.colNet, locale)}</Th>
              <Th className="text-end">{tl(T.colStatus, locale)}</Th>
              <Th className="text-end">{tl(T.colAction, locale)}</Th>
            </div>
            <ul>
              {payouts.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_1.4fr] gap-xs md:gap-md px-xl py-md border-b border-border last:border-0 items-center"
                >
                  <span className="text-body-sm font-semibold text-text-default truncate">
                    {p.host_profiles?.display_name ?? '—'}
                  </span>
                  <span className="text-body-sm text-text-muted tabular-nums">
                    {formatDate(p.period_start, locale)} → {formatDate(p.period_end, locale)}
                  </span>
                  <span className="text-body-sm text-text-default md:text-end">
                    <bdi className="tabular-nums font-semibold">{formatDZD(p.net_dzd, locale)}</bdi>
                  </span>
                  <span className="md:text-end">
                    <StatusPill {...statusOf(PAYOUT_STATUS, p.status, locale)} />
                  </span>
                  <span className="md:text-end md:justify-self-end">
                    {p.status !== 'paid' ? (
                      <MarkPaidButton payoutId={p.id} locale={locale} />
                    ) : (
                      <span className="text-caption text-text-muted tabular-nums">
                        {formatDate(p.paid_at, locale)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </TableShell>
        )}
      </section>

      {/* ── Transactions ────────────────────────────────────────────────── */}
      <section className="flex items-center justify-between gap-md flex-wrap">
        <h2 className="font-display text-heading-2 font-semibold text-primary">{tl(T.txns, locale)}</h2>
        <FilterSelect
          paramKey="status"
          options={statusOptions}
          allLabel={tl(T.statusAll, locale)}
          current={status}
        />
      </section>

      {txns.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <TableShell>
          <div className="hidden md:grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1.2fr] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colWhen, locale)}</Th>
            <Th>{tl(T.colBooking, locale)}</Th>
            <Th>{tl(T.colProvider, locale)}</Th>
            <Th className="text-end">{tl(T.colAmount, locale)}</Th>
            <Th className="text-end">{tl(T.colStatus, locale)}</Th>
            <Th className="text-end">{tl(T.colAction, locale)}</Th>
          </div>
          <ul>
            {txns.map((tx) => {
              const remaining = (tx.amount_dzd ?? 0) - (tx.refunded_dzd ?? 0);
              const refundable = tx.kind === 'payment' && tx.status === 'paid' && remaining > 0;
              return (
                <li
                  key={tx.id}
                  className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1.2fr] gap-xs md:gap-md px-xl py-md border-b border-border last:border-0 items-center"
                >
                  <span className="text-body-sm text-text-muted tabular-nums">
                    {formatDateTime(tx.created_at, locale)}
                  </span>
                  <span className="text-body-sm text-text-default tabular-nums" dir="ltr">
                    {tx.bookings?.code ? (
                      <a href={`/bookings/${tx.booking_id}`} className="text-primary hover:underline">
                        {tx.bookings.code}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                  <span className="text-body-sm text-text-muted">{tx.provider}</span>
                  <span className="text-body-sm text-text-default md:text-end">
                    <bdi className="tabular-nums">{formatDZD(tx.amount_dzd, locale)}</bdi>
                  </span>
                  <span className="md:text-end">
                    <StatusPill {...statusOf(TXN_STATUS, tx.status, locale)} />
                  </span>
                  <span className="md:text-end md:justify-self-end">
                    {refundable ? <RefundButton txnId={tx.id} maxRefund={remaining} locale={locale} /> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </TableShell>
      )}
    </AdminShell>
  );
}

// Local inline helpers (small, page-specific).
function PageHeaderInline({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section>
      <h1 className="font-display text-heading-1 font-semibold text-primary mb-xs">{title}</h1>
      <p className="text-body-sm text-text-muted">{subtitle}</p>
    </section>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-sm">
      <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <span
        className={`font-display text-heading-1 font-semibold tabular-nums ${
          accent ? 'text-accent' : 'text-primary'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
