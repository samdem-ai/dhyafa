/**
 * Payouts — statements with commission breakdown and history.
 *
 * Server Component (RLS-scoped: payouts SELECT is owner/manager only; reception
 * is excluded). Shows summary tiles (total net paid, pending) and a list of
 * payout statements; each statement shows gross → commission → net, period,
 * status, reference and (when available) destination RIB.
 *
 * Reception is gated out in the UI; RLS also blocks the read.
 */

import { requireHost, canManage } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { formatDZD, type Locale } from '@dyafa/i18n';
import {
  T,
  tl,
  formatDate,
  payoutStatusLabel,
  payoutStatusColor,
} from '../../../lib/dashboard-i18n';
import { PageHeader, KpiCard, EmptyState, ErrorState, StatusPill, Price } from '../../../components/ui';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

type PayoutStatus = Database['public']['Enums']['payout_status'];

interface PayoutRow {
  id: string;
  period_start: string;
  period_end: string;
  gross_dzd: number;
  commission_amount_dzd: number;
  net_dzd: number;
  status: PayoutStatus;
  paid_at: string | null;
  reference: string | null;
  destination_rib: string | null;
}

export default async function PayoutsPage() {
  const session = await requireHost('/payouts');
  const locale: Locale = resolveLocale();

  // Reception is not authorized to view financials.
  if (!canManage(session)) {
    return (
      <>
        <PageHeader title={tl(T.poTitle, locale)} />
        <EmptyState title={tl(T.poTitle, locale)} body={tl(T.accessDenied, locale)} />
      </>
    );
  }

  const supabase = createUserClient(session.accessToken);

  const { data, error } = await supabase
    .from('payouts')
    .select(
      'id, period_start, period_end, gross_dzd, commission_amount_dzd, net_dzd, status, paid_at, reference, destination_rib',
    )
    .order('period_end', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as PayoutRow[];

  const totalPaid = rows
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.net_dzd ?? 0), 0);
  const totalPending = rows
    .filter((p) => p.status === 'pending' || p.status === 'processing' || p.status === 'on_hold')
    .reduce((sum, p) => sum + (p.net_dzd ?? 0), 0);

  return (
    <>
      <PageHeader title={tl(T.poTitle, locale)} subtitle={tl(T.poSubtitle, locale)} />

      {error && <ErrorState title={tl(T.errorTitle, locale)} message={error.message} />}

      {!error && (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
          <KpiCard label={tl(T.poTotalNet, locale)} value={formatDZD(totalPaid, locale)} accent />
          <KpiCard label={tl(T.poTotalPending, locale)} value={formatDZD(totalPending, locale)} />
        </div>
      )}

      {!error && rows.length === 0 && (
        <EmptyState title={tl(T.poTitle, locale)} body={tl(T.poEmpty, locale)} />
      )}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-md">
          {rows.map((p) => (
            <li key={p.id} className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md">
              <div className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-xs">
                  <span className="text-title font-semibold text-text-default tabular-nums">
                    {formatDate(p.period_start, locale)} → {formatDate(p.period_end, locale)}
                  </span>
                  {p.reference && (
                    <span className="text-caption text-text-muted" dir="ltr">
                      {tl(T.poReference, locale)}: {p.reference}
                    </span>
                  )}
                </div>
                <StatusPill
                  label={payoutStatusLabel(p.status, locale)}
                  colorClass={payoutStatusColor(p.status)}
                />
              </div>

              {/* Commission breakdown: gross − commission = net */}
              <dl className="grid grid-cols-3 gap-md rounded-md bg-surface-sunken px-md py-sm">
                <div className="flex flex-col gap-xs">
                  <dt className="text-caption text-text-muted">{tl(T.poGross, locale)}</dt>
                  <dd className="text-body font-semibold text-text-default">
                    <Price amount={p.gross_dzd} locale={locale} />
                  </dd>
                </div>
                <div className="flex flex-col gap-xs">
                  <dt className="text-caption text-text-muted">{tl(T.poCommission, locale)}</dt>
                  <dd className="text-body font-semibold text-error">
                    <bdi className="tabular-nums">−{formatDZD(p.commission_amount_dzd, locale)}</bdi>
                  </dd>
                </div>
                <div className="flex flex-col gap-xs">
                  <dt className="text-caption text-text-muted">{tl(T.poNet, locale)}</dt>
                  <dd className="text-body font-semibold text-accent">
                    <Price amount={p.net_dzd} locale={locale} />
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-lg text-body-sm text-text-muted">
                {p.paid_at && (
                  <span>
                    {tl(T.poPaidAt, locale)}: <span className="tabular-nums">{formatDate(p.paid_at, locale)}</span>
                  </span>
                )}
                {p.destination_rib && (
                  <span dir="ltr">
                    {tl(T.poRib, locale)}: {p.destination_rib}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
