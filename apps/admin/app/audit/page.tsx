/**
 * Audit log viewer — read-only, filterable by action / target type / actor.
 *
 * Server Component, gated by `requireAdmin()`. The `audit_log` table is
 * append-only (no write path here). Filters live in URL search params
 * (?action= ?target= ?actor=). Actor display names are resolved with a single
 * follow-up profiles query. before/after JSON is shown collapsed via <details>.
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import { C, formatDateTime, tl } from '../../lib/admin-i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { PageHeader, EmptyState, ErrorState } from '../../components/ui';
import { SearchBar } from '../../components/SearchBar';
import { FilterSelect, type FilterOption } from '../../components/FilterSelect';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 60;

const T = {
  title: { ar: 'سجل التدقيق', fr: 'Journal d’audit', en: 'Audit log' },
  subtitle: {
    ar: 'سجل غير قابل للتعديل لكل إجراء حسّاس',
    fr: 'Registre inaltérable de chaque action sensible',
    en: 'Append-only record of every sensitive action',
  },
  actionAll: { ar: 'كل الإجراءات', fr: 'Toutes les actions', en: 'All actions' },
  targetAll: { ar: 'كل الأنواع', fr: 'Tous les types', en: 'All target types' },
  actorPlaceholder: { ar: 'معرّف الفاعل (UUID)…', fr: 'ID acteur (UUID)…', en: 'Actor id (UUID)…' },
  by: { ar: 'بواسطة', fr: 'par', en: 'by' },
  target: { ar: 'الهدف', fr: 'Cible', en: 'Target' },
  reason: { ar: 'السبب', fr: 'Motif', en: 'Reason' },
  changes: { ar: 'التغييرات', fr: 'Modifications', en: 'Changes' },
  before: { ar: 'قبل', fr: 'Avant', en: 'Before' },
  after: { ar: 'بعد', fr: 'Après', en: 'After' },
} as const;

interface AuditRow {
  id: number;
  action: string;
  actor_id: string;
  actor_role: string | null;
  target_type: string;
  target_id: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  reason_code: string | null;
  created_at: string;
}

// Distinct action/target enumerations surfaced by the M6 actions (for filters).
const ACTIONS = [
  'listing.approve',
  'listing.reject',
  'user.verify',
  'user.suspend',
  'user.unsuspend',
  'booking.force_cancel',
  'payment.refund',
  'payout.run',
  'payout.release',
  'review.remove',
  'dispute.resolve',
  'content.update',
] as const;

const TARGETS = [
  'property',
  'profile',
  'host_profile',
  'booking',
  'transaction',
  'payout',
  'payout_batch',
  'review',
  'dispute',
  'featured_collection',
  'collection_item',
  'promo_banner',
  'home_rail',
  'property_type',
  'amenity',
  'wilaya',
] as const;

function jsonPreview(value: unknown): string | null {
  if (value == null) return null;
  try {
    const s = JSON.stringify(value);
    return s === '{}' || s === 'null' ? null : s;
  } catch {
    return null;
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { action?: string; target?: string; actor?: string };
}) {
  await requireAdmin('/audit');
  const locale: Locale = resolveLocale();

  const action = searchParams.action ?? null;
  const target = searchParams.target ?? null;
  const actor = searchParams.actor?.trim() ?? '';

  let query = adminSupabase
    .from('audit_log')
    .select('id, action, actor_id, actor_role, target_type, target_id, before, after, reason, reason_code, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (action && (ACTIONS as readonly string[]).includes(action)) query = query.eq('action', action);
  if (target && (TARGETS as readonly string[]).includes(target)) query = query.eq('target_type', target);
  if (actor) query = query.eq('actor_id', actor);

  const { data, error } = await query;
  const rows = (data ?? []) as AuditRow[];

  // Resolve actor names.
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: people } = await adminSupabase
      .from('profiles')
      .select('id, display_name')
      .in('id', actorIds);
    for (const p of (people ?? []) as { id: string; display_name: string }[]) {
      nameById.set(p.id, p.display_name);
    }
  }

  const actionOptions: FilterOption[] = ACTIONS.map((a) => ({ value: a, label: a }));
  const targetOptions: FilterOption[] = TARGETS.map((t) => ({ value: t, label: t }));

  return (
    <AdminAppShell locale={locale}>
      <PageHeader title={tl(T.title, locale)} subtitle={tl(T.subtitle, locale)} />

      <section className="flex flex-wrap items-center gap-sm">
        <FilterSelect paramKey="action" options={actionOptions} allLabel={tl(T.actionAll, locale)} current={action} />
        <FilterSelect paramKey="target" options={targetOptions} allLabel={tl(T.targetAll, locale)} current={target} />
        <SearchBar locale={locale} paramKey="actor" placeholder={tl(T.actorPlaceholder, locale)} />
      </section>

      {error && <ErrorState locale={locale} message={error.message} />}
      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-sm">
          {rows.map((row) => {
            const before = jsonPreview(row.before);
            const after = jsonPreview(row.after);
            return (
              <li key={row.id} className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-sm">
                <div className="flex items-start justify-between gap-md flex-wrap">
                  <div className="flex flex-col gap-xs min-w-0">
                    <span className="text-title font-semibold text-text-default font-mono">{row.action}</span>
                    <span className="text-body-sm text-text-muted">
                      {tl(T.by, locale)} {nameById.get(row.actor_id) ?? row.actor_id}
                      {row.actor_role ? ` (${row.actor_role})` : ''} · {tl(T.target, locale)}:{' '}
                      <span className="font-mono">{row.target_type}</span>
                      {row.target_id ? (
                        <span className="tabular-nums" dir="ltr">
                          {' '}
                          {row.target_id}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <span className="text-caption text-text-muted tabular-nums">
                    {formatDateTime(row.created_at, locale)}
                  </span>
                </div>

                {(row.reason || row.reason_code) && (
                  <p className="text-body-sm text-text-default">
                    <span className="text-text-muted">{tl(T.reason, locale)}: </span>
                    {row.reason_code ? <span className="font-mono">{row.reason_code}</span> : null}
                    {row.reason ? ` ${row.reason}` : ''}
                  </p>
                )}

                {(before || after) && (
                  <details className="text-caption">
                    <summary className="cursor-pointer text-text-muted hover:text-text-default">
                      {tl(T.changes, locale)}
                    </summary>
                    <div className="mt-xs flex flex-col gap-xs">
                      {before && (
                        <div className="rounded-md bg-surface-sunken px-md py-xs overflow-x-auto">
                          <span className="font-semibold text-text-muted">{tl(T.before, locale)}: </span>
                          <code className="font-mono" dir="ltr">
                            {before}
                          </code>
                        </div>
                      )}
                      {after && (
                        <div className="rounded-md bg-surface-sunken px-md py-xs overflow-x-auto">
                          <span className="font-semibold text-text-muted">{tl(T.after, locale)}: </span>
                          <code className="font-mono" dir="ltr">
                            {after}
                          </code>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminAppShell>
  );
}
