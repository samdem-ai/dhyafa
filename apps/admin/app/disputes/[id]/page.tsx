/**
 * Dispute detail — full context, message thread, and the resolution workflow.
 *
 * Server Component, gated by `requireAdmin()`. Loads the dispute (parties +
 * booking), its `dispute_messages` thread (oldest first), and renders the
 * ResolvePanel. Sender names are resolved with a single follow-up profiles query.
 */

import { notFound } from 'next/navigation';
import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import {
  C,
  DISPUTE_CATEGORY,
  DISPUTE_STATUS,
  formatDateTime,
  statusOf,
  tl,
} from '../../../lib/admin-i18n';
import { AdminAppShell } from '../../../components/AdminAppShell';
import { SectionCard, MetaRow, StatusPill } from '../../../components/ui';
import { ResolvePanel } from './ResolvePanel';

export const dynamic = 'force-dynamic';

const T = {
  context: { ar: 'سياق النزاع', fr: 'Contexte', en: 'Context' },
  thread: { ar: 'المحادثة', fr: 'Fil de discussion', en: 'Message thread' },
  category: { ar: 'الفئة', fr: 'Catégorie', en: 'Category' },
  booking: { ar: 'الحجز', fr: 'Réservation', en: 'Booking' },
  openedBy: { ar: 'فتحه', fr: 'Ouvert par', en: 'Opened by' },
  against: { ar: 'ضدّ', fr: 'Contre', en: 'Against' },
  opened: { ar: 'فُتح في', fr: 'Ouvert le', en: 'Opened' },
  description: { ar: 'الوصف', fr: 'Description', en: 'Description' },
  resolutionNote: { ar: 'ملاحظة الحل', fr: 'Note de résolution', en: 'Resolution note' },
  resolvedAt: { ar: 'حُلّ في', fr: 'Résolu le', en: 'Resolved at' },
  noMessages: { ar: 'لا توجد رسائل', fr: 'Aucun message', en: 'No messages' },
  attachment: { ar: 'مرفق', fr: 'Pièce jointe', en: 'Attachment' },
} as const;

interface MessageRow {
  id: string;
  body: string | null;
  evidence_path: string | null;
  created_at: string;
  sender_id: string;
}

interface DisputeDetail {
  id: string;
  status: string;
  category: string;
  description: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  booking_id: string;
  opened_by: string;
  against: string | null;
  bookings: { code: string } | null;
  opener: { id: string; display_name: string } | null;
  accused: { id: string; display_name: string } | null;
}

export default async function DisputeDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin(`/disputes/${params.id}`);
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('disputes')
    .select(
      `id, status, category, description, resolution_note, resolved_at, created_at, booking_id, opened_by, against,
       bookings ( code ),
       opener:profiles!disputes_opened_by_fkey ( id, display_name ),
       accused:profiles!disputes_against_fkey ( id, display_name )`,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) {
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

  const d = data as unknown as DisputeDetail;

  const { data: msgData } = await adminSupabase
    .from('dispute_messages')
    .select('id, body, evidence_path, created_at, sender_id')
    .eq('dispute_id', params.id)
    .order('created_at', { ascending: true });
  const messages = (msgData ?? []) as MessageRow[];

  // Resolve sender names with a single follow-up query.
  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
  const nameById = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: people } = await adminSupabase
      .from('profiles')
      .select('id, display_name')
      .in('id', senderIds);
    for (const p of (people ?? []) as { id: string; display_name: string }[]) {
      nameById.set(p.id, p.display_name);
    }
  }

  return (
    <AdminAppShell locale={locale}>
      <section className="flex items-center justify-between gap-md flex-wrap">
        <div className="flex flex-col gap-xs">
          <a href="/disputes" className="text-body-sm text-primary hover:underline">
            {tl(C.back, locale)}
          </a>
          <h1 className="font-display text-display-lg font-semibold text-primary">
            {DISPUTE_CATEGORY[d.category]?.[locale] ?? d.category}
          </h1>
        </div>
        <StatusPill {...statusOf(DISPUTE_STATUS, d.status, locale)} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-xl items-start">
        <div className="flex flex-col gap-xl">
          <SectionCard title={tl(T.context, locale)}>
            <div className="flex flex-col">
              <MetaRow label={tl(T.category, locale)} value={DISPUTE_CATEGORY[d.category]?.[locale] ?? d.category} />
              <MetaRow
                label={tl(T.booking, locale)}
                value={
                  <a className="text-primary hover:underline tabular-nums" href={`/bookings/${d.booking_id}`} dir="ltr">
                    {d.bookings?.code ?? d.booking_id}
                  </a>
                }
              />
              <MetaRow
                label={tl(T.openedBy, locale)}
                value={
                  d.opener ? (
                    <a className="text-primary hover:underline" href={`/users/${d.opener.id}`}>
                      {d.opener.display_name}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              {d.accused && (
                <MetaRow
                  label={tl(T.against, locale)}
                  value={
                    <a className="text-primary hover:underline" href={`/users/${d.accused.id}`}>
                      {d.accused.display_name}
                    </a>
                  }
                />
              )}
              <MetaRow label={tl(T.opened, locale)} value={formatDateTime(d.created_at, locale)} />
              {d.resolved_at && (
                <MetaRow label={tl(T.resolvedAt, locale)} value={formatDateTime(d.resolved_at, locale)} />
              )}
            </div>
            {d.description && (
              <div className="mt-md">
                <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                  {tl(T.description, locale)}
                </span>
                <p className="text-body text-text-default whitespace-pre-line mt-xs">{d.description}</p>
              </div>
            )}
            {d.resolution_note && (
              <div className="mt-md rounded-md bg-success-bg text-success px-md py-sm">
                <span className="text-caption font-semibold uppercase tracking-wide">
                  {tl(T.resolutionNote, locale)}
                </span>
                <p className="text-body-sm mt-xs whitespace-pre-line">{d.resolution_note}</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title={tl(T.thread, locale)}>
            {messages.length === 0 ? (
              <p className="text-body-sm italic text-text-muted">{tl(T.noMessages, locale)}</p>
            ) : (
              <ul className="flex flex-col gap-md">
                {messages.map((m) => (
                  <li key={m.id} className="rounded-md border border-border p-md flex flex-col gap-xs">
                    <div className="flex items-center justify-between gap-md">
                      <span className="text-body-sm font-semibold text-text-default">
                        {nameById.get(m.sender_id) ?? '—'}
                      </span>
                      <span className="text-caption text-text-muted tabular-nums">
                        {formatDateTime(m.created_at, locale)}
                      </span>
                    </div>
                    {m.body && <p className="text-body text-text-default whitespace-pre-line">{m.body}</p>}
                    {m.evidence_path && (
                      <span className="text-caption text-info">{tl(T.attachment, locale)}: {m.evidence_path}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-xl lg:sticky lg:top-[112px]">
          <ResolvePanel disputeId={d.id} status={d.status} locale={locale} />
        </aside>
      </div>
    </AdminAppShell>
  );
}
