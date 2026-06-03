/**
 * Staff — list hotel_staff members and (owner only) add new ones by user id.
 *
 * Server Component (RLS-scoped). Shows each member's name, role, and active
 * status, plus a capability legend (reception vs manager). The Staff nav item is
 * already owner-gated, but we re-check `isOwner()` here so a deep-link by a
 * non-owner shows an access notice (the RPC is also owner-only).
 */

import { requireHost, isOwner } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { type Locale } from '@dyafa/i18n';
import { T, tl, formatDate } from '../../../lib/dashboard-i18n';
import { PageHeader, EmptyState, ErrorState, StatusPill } from '../../../components/ui';
import { AddStaffForm } from './AddStaffForm';
import type { Database } from '@dyafa/api-client';

export const dynamic = 'force-dynamic';

type StaffRole = Database['public']['Enums']['staff_role'];

interface StaffMemberRow {
  id: string;
  user_id: string;
  staff_role: StaffRole;
  is_active: boolean;
  accepted_at: string | null;
  created_at: string;
}

export default async function StaffPage() {
  const session = await requireHost('/staff');
  const locale: Locale = resolveLocale();
  const owner = isOwner(session);

  if (!owner) {
    return (
      <>
        <PageHeader title={tl(T.stfTitle, locale)} />
        <EmptyState title={tl(T.stfTitle, locale)} body={tl(T.stfOwnerOnly, locale)} />
      </>
    );
  }

  const supabase = createUserClient(session.accessToken);

  const { data, error } = await supabase
    .from('hotel_staff')
    .select('id, user_id, staff_role, is_active, accepted_at, created_at')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as StaffMemberRow[];

  // Resolve member display names.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const namesRes = userIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
    : { data: [] as { id: string; display_name: string }[] };
  const name = new Map(
    ((namesRes.data ?? []) as { id: string; display_name: string }[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );

  const roleLabel = (r: StaffRole): string =>
    r === 'manager' ? tl(T.roleManager, locale) : tl(T.roleReception, locale);

  return (
    <>
      <PageHeader title={tl(T.stfTitle, locale)} subtitle={tl(T.stfSubtitle, locale)} />

      <AddStaffForm locale={locale} />

      {error && <ErrorState title={tl(T.errorTitle, locale)} message={error.message} />}

      {!error && rows.length === 0 && (
        <EmptyState title={tl(T.stfTitle, locale)} body={tl(T.stfEmpty, locale)} />
      )}

      {!error && rows.length > 0 && (
        <div className="rounded-card bg-surface shadow-card overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-caption font-semibold uppercase tracking-wide text-text-muted">
                <th className="text-start px-lg py-md font-semibold">{tl(T.stfMember, locale)}</th>
                <th className="text-start px-lg py-md font-semibold">{tl(T.stfRole, locale)}</th>
                <th className="text-start px-lg py-md font-semibold">{tl(T.stfStatus, locale)}</th>
                <th className="text-end px-lg py-md font-semibold">{tl(T.poPeriod, locale)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-lg py-md text-text-default font-medium">
                    {name.get(m.user_id) ?? (
                      <span className="font-mono text-text-muted" dir="ltr">
                        {m.user_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="px-lg py-md text-text-default">{roleLabel(m.staff_role)}</td>
                  <td className="px-lg py-md">
                    <StatusPill
                      label={m.is_active ? tl(T.stfActive, locale) : tl(T.stfInvited, locale)}
                      colorClass={
                        m.is_active ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
                      }
                    />
                  </td>
                  <td className="px-lg py-md text-end text-text-muted tabular-nums">
                    {formatDate(m.accepted_at ?? m.created_at, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Capability legend */}
      <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-sm">
        <h3 className="font-display text-heading-3 font-semibold text-primary">
          {tl(T.stfCapabilities, locale)}
        </h3>
        <p className="text-body-sm text-text-default">{tl(T.stfCapReception, locale)}</p>
        <p className="text-body-sm text-text-default">{tl(T.stfCapManager, locale)}</p>
      </div>
    </>
  );
}
