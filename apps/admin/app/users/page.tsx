/**
 * User management — search guests/hosts, see status, drill into a profile.
 *
 * Server Component, gated by `requireAdmin()`. Searches `profiles` by display
 * name / full name / phone (URL `?q=`); flags which users are hosts (+ their
 * identity verification) by joining `host_profiles` on owner_id.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import {
  C,
  formatDate,
  statusOf,
  tl,
  VERIFICATION_STATUS,
} from '../../lib/admin-i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { PageHeader, StatusPill, TableShell, Th, EmptyState, ErrorState } from '../../components/ui';
import { SearchBar } from '../../components/SearchBar';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

const T = {
  title: { ar: 'المستخدمون', fr: 'Utilisateurs', en: 'Users' },
  subtitle: {
    ar: 'ابحث عن الضيوف والمضيفين وأدِر حساباتهم',
    fr: 'Recherchez voyageurs et hôtes, gérez leurs comptes',
    en: 'Search guests and hosts, manage their accounts',
  },
  searchPlaceholder: {
    ar: 'الاسم أو رقم الهاتف…',
    fr: 'Nom ou téléphone…',
    en: 'Name or phone…',
  },
  colName: { ar: 'الاسم', fr: 'Nom', en: 'Name' },
  colPhone: { ar: 'الهاتف', fr: 'Téléphone', en: 'Phone' },
  colRole: { ar: 'النوع', fr: 'Rôle', en: 'Role' },
  colJoined: { ar: 'انضم في', fr: 'Inscrit le', en: 'Joined' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  guest: { ar: 'ضيف', fr: 'Voyageur', en: 'Guest' },
  host: { ar: 'مضيف', fr: 'Hôte', en: 'Host' },
  active: { ar: 'نشط', fr: 'Actif', en: 'Active' },
  suspended: { ar: 'معلّق', fr: 'Suspendu', en: 'Suspended' },
} as const;

interface ProfileRow {
  id: string;
  display_name: string;
  full_name: string | null;
  phone_e164: string | null;
  is_active: boolean;
  created_at: string;
}

interface HostRow {
  owner_id: string;
  identity_status: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdmin('/users');
  const locale: Locale = resolveLocale();
  const q = searchParams.q?.trim() ?? '';

  let query = adminSupabase
    .from('profiles')
    .select('id, display_name, full_name, phone_e164, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (q) {
    // OR across the human-searchable columns.
    const like = `%${q}%`;
    query = query.or(
      `display_name.ilike.${like},full_name.ilike.${like},phone_e164.ilike.${like}`,
    );
  }

  const { data, error } = await query;
  const rows = (data ?? []) as ProfileRow[];

  // Which of these users are hosts? (single follow-up query, keyed by owner_id)
  const hostByOwner = new Map<string, HostRow>();
  if (rows.length > 0) {
    const { data: hosts } = await adminSupabase
      .from('host_profiles')
      .select('owner_id, identity_status')
      .in(
        'owner_id',
        rows.map((r) => r.id),
      );
    for (const h of (hosts ?? []) as HostRow[]) hostByOwner.set(h.owner_id, h);
  }

  return (
    <AdminAppShell locale={locale}>
      <PageHeader
        title={tl(T.title, locale)}
        subtitle={tl(T.subtitle, locale)}
        action={<SearchBar locale={locale} placeholder={tl(T.searchPlaceholder, locale)} />}
      />

      {error && <ErrorState locale={locale} message={error.message} />}

      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <TableShell>
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colName, locale)}</Th>
            <Th>{tl(T.colPhone, locale)}</Th>
            <Th>{tl(T.colRole, locale)}</Th>
            <Th>{tl(T.colJoined, locale)}</Th>
            <Th className="text-end">{tl(T.colStatus, locale)}</Th>
          </div>
          <ul>
            {rows.map((u) => {
              const host = hostByOwner.get(u.id);
              const statusPill = u.is_active
                ? { text: tl(T.active, locale), tone: 'success' as const }
                : { text: tl(T.suspended, locale), tone: 'error' as const };
              return (
                <li key={u.id} className="border-b border-border last:border-0">
                  <a
                    href={`/users/${u.id}`}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-xs md:gap-md px-xl py-md hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset items-center"
                  >
                    <div className="flex flex-col gap-xs min-w-0">
                      <span className="text-title font-semibold text-text-default truncate">
                        {u.display_name}
                      </span>
                      {u.full_name && u.full_name !== u.display_name && (
                        <span className="text-body-sm text-text-muted truncate">{u.full_name}</span>
                      )}
                    </div>
                    <span className="text-body-sm text-text-muted md:text-text-default tabular-nums" dir="ltr">
                      {u.phone_e164 ?? '—'}
                    </span>
                    <span className="flex items-center gap-xs">
                      {host ? (
                        <>
                          <span className="rounded-pill bg-info-bg text-info text-caption font-semibold px-md py-xs">
                            {tl(T.host, locale)}
                          </span>
                          <StatusPill {...statusOf(VERIFICATION_STATUS, host.identity_status, locale)} />
                        </>
                      ) : (
                        <span className="text-body-sm text-text-muted">{tl(T.guest, locale)}</span>
                      )}
                    </span>
                    <span className="text-body-sm text-text-muted tabular-nums">
                      {formatDate(u.created_at, locale)}
                    </span>
                    <span className="md:text-end">
                      <StatusPill {...statusPill} />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </TableShell>
      )}

      {!error && rows.length === PAGE_SIZE && (
        <p className="text-caption text-text-muted text-center">
          {tl(C.filters, locale)}: {tl(T.searchPlaceholder, locale)}
        </p>
      )}
    </AdminAppShell>
  );
}
