/**
 * Shared audit-log + request-metadata helpers for privileged Server Actions.
 *
 * The listing-moderation actions (app/moderation/actions.ts) established the
 * pattern: every sensitive mutation writes one append-only `audit_log` row with
 * actor_id / actor_role / action / target_type / target_id / before / after /
 * reason_code / reason (+ best-effort ip / user_agent). This module centralizes
 * that write so the M6 actions don't re-implement it.
 *
 * SERVER-ONLY: imports the service-role client.
 */

import 'server-only';
import { headers } from 'next/headers';
import { adminSupabase } from './supabase/server';
import type { AppRole } from './auth';

/**
 * Canonical Postgres JSON shape (matches the generated `Json` type in
 * @dyafa/types, which the package index does not re-export). Used for the
 * `audit_log.before/after` jsonb columns.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Resolve actor IP / user-agent for an audit row (best-effort, may be null). */
export function requestMeta(): { ip: string | null; userAgent: string | null } {
  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  const userAgent = h.get('user-agent') ?? null;
  return { ip, userAgent };
}

export interface AuditInput {
  actorId: string;
  actorRole: AppRole;
  action: string;
  targetType: string;
  targetId: string | null;
  before?: Json;
  after?: Json;
  reasonCode?: string | null;
  reason?: string | null;
}

/**
 * Insert one audit_log row. Returns an error message on failure (never throws),
 * so callers can fold it into a 'partial' result the way moderation/actions.ts
 * does — the primary mutation has already been applied by the time we log.
 */
export async function writeAudit(input: AuditInput): Promise<string | null> {
  const { ip, userAgent } = requestMeta();
  const { error } = await adminSupabase.from('audit_log').insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason_code: input.reasonCode ?? null,
    reason: input.reason ?? null,
    ip,
    user_agent: userAgent,
  });
  return error ? error.message : null;
}

/** Insert one in-app notification (localized). Returns error message or null. */
export async function notify(input: {
  userId: string;
  type: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  bodyAr: string;
  bodyFr: string;
  bodyEn: string;
  data?: Json;
}): Promise<string | null> {
  const { error } = await adminSupabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title_ar: input.titleAr,
    title_fr: input.titleFr,
    title_en: input.titleEn,
    body_ar: input.bodyAr,
    body_fr: input.bodyFr,
    body_en: input.bodyEn,
    data: input.data ?? null,
    sent_push: false,
  });
  return error ? error.message : null;
}
