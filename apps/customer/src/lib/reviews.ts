/**
 * Typed data layer for reviews (M3).
 *
 * Three RPCs (insert/update are RPC-only, RLS-guarded):
 *  - submit_review(): the booking's guest leaves ONE review on a completed stay
 *    (6 category 1-5 scores + optional comment; overall auto-computed server-side
 *    when omitted).
 *  - host_reply_review(): the property's host owner/staff posts ONE reply.
 *  - report_review(): anyone who can see a review opens a dispute on it.
 *
 * These RPCs aren't in the BUILT @dyafa/api-client Database type yet (same gap
 * as become_host in src/lib/listings.ts — the generated `.rpc()` map predates
 * them), so they go through a narrowly loosened rpc signature; table reads stay
 * fully typed. No `as any`.
 *
 * Reads (RLS-scoped):
 *  - listReviewsForProperty(): published reviews + their single host reply, for
 *    the property detail reviews section (overall + category averages live here).
 *  - listHostReviews(): every review on the signed-in host's OWN properties, with
 *    property title + any reply, for the host reviews screen.
 */

import type { Database } from '@dyafa/api-client';
import { supabaseClient } from './supabase';

type Tables = Database['public']['Tables'];

export type ReviewRow = Tables['reviews']['Row'];
export type ReviewReplyRow = Tables['review_replies']['Row'];

/** The six rated categories, in display order. */
export const REVIEW_CATEGORIES = [
  'cleanliness',
  'accuracy',
  'communication',
  'location',
  'value',
  'checkin',
] as const;

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Loosened rpc surface for the RPCs missing from the generated types.
// (Mirrors the LooseRpc pattern already used in src/lib/listings.ts.)
// ---------------------------------------------------------------------------
type LooseRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = supabaseClient as unknown as LooseRpc;

// ---------------------------------------------------------------------------
// submit_review
// ---------------------------------------------------------------------------

export interface SubmitReviewInput {
  bookingId: string;
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  value: number;
  checkin: number;
  comment?: string | null;
  /** Optional explicit overall; when null the server averages the categories. */
  overall?: number | null;
}

/** Submit a guest review for a completed booking. Returns the new review id. */
export async function submitReview(input: SubmitReviewInput): Promise<string> {
  const { data, error } = await rpcClient.rpc('submit_review', {
    p_booking_id: input.bookingId,
    p_cleanliness: input.cleanliness,
    p_accuracy: input.accuracy,
    p_communication: input.communication,
    p_location: input.location,
    p_value: input.value,
    p_checkin: input.checkin,
    p_comment: input.comment ?? null,
    p_overall: input.overall ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('no review id returned');
  return data as string;
}

// ---------------------------------------------------------------------------
// host_reply_review / report_review (loosened)
// ---------------------------------------------------------------------------

/** Host posts a public reply to a review. Returns the reply id. */
export async function hostReplyReview(reviewId: string, body: string): Promise<string> {
  const { data, error } = await rpcClient.rpc('host_reply_review', {
    p_review_id: reviewId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Open a dispute reporting a review. Returns the dispute id. */
export async function reportReview(reviewId: string, reason: string): Promise<string> {
  const { data, error } = await rpcClient.rpc('report_review', {
    p_review_id: reviewId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** A review with its author display name + single host reply (if any). */
export interface ReviewWithReply extends ReviewRow {
  author: { id: string; display_name: string } | null;
  reply: Pick<ReviewReplyRow, 'id' | 'body' | 'created_at'> | null;
}

/** A host-side review row that also carries its property's localized titles. */
export interface HostReviewItem extends ReviewWithReply {
  property: {
    id: string;
    title_ar: string | null;
    title_fr: string | null;
    title_en: string | null;
  } | null;
}

const REVIEW_SELECT = `
  id, booking_id, property_id, author_id, overall,
  cleanliness, accuracy, communication, location, value, checkin,
  comment_text, status, target, published_at, deleted_at, created_at, updated_at,
  author:profiles ( id, display_name ),
  review_replies ( id, body, created_at )
`;

interface RawReview extends ReviewRow {
  author: { id: string; display_name: string } | null;
  review_replies: Pick<ReviewReplyRow, 'id' | 'body' | 'created_at'>[] | null;
}

function toReviewWithReply(raw: RawReview): ReviewWithReply {
  const replies = raw.review_replies ?? [];
  return {
    ...raw,
    author: raw.author,
    reply: replies[0] ?? null,
  };
}

/** Average of the defined values for one category across a set of reviews. */
export function categoryAverage(reviews: ReviewRow[], category: ReviewCategory): number | null {
  const vals = reviews
    .map((r) => r[category])
    .filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Mean overall across a set of reviews (0 when empty). */
export function overallAverage(reviews: ReviewRow[]): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((a, r) => a + r.overall, 0) / reviews.length;
}

/**
 * Published reviews for a property (newest first), each with author + reply.
 * Public RLS lets anyone read published reviews.
 */
export async function listReviewsForProperty(propertyId: string): Promise<ReviewWithReply[]> {
  const { data, error } = await supabaseClient
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('property_id', propertyId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const raws = (data ?? []) as unknown as RawReview[];
  return raws.map(toReviewWithReply);
}

/**
 * All reviews on the signed-in host's properties (newest first), each with the
 * property title + any existing reply. RLS scopes properties to the owner; we
 * join reviews via the owned property ids.
 */
export async function listHostReviews(): Promise<HostReviewItem[]> {
  const { data: auth } = await supabaseClient.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  // Host profile(s) the caller owns → their property ids.
  const { data: hosts, error: hostErr } = await supabaseClient
    .from('host_profiles')
    .select('id')
    .eq('owner_id', uid);
  if (hostErr) throw hostErr;
  const hostIds = (hosts ?? []).map((h) => h.id);
  if (hostIds.length === 0) return [];

  const { data: props, error: propErr } = await supabaseClient
    .from('properties')
    .select('id, title_ar, title_fr, title_en')
    .in('host_profile_id', hostIds);
  if (propErr) throw propErr;
  const properties = props ?? [];
  if (properties.length === 0) return [];

  const propById = new Map(properties.map((p) => [p.id, p]));
  const propertyIds = properties.map((p) => p.id);

  const { data, error } = await supabaseClient
    .from('reviews')
    .select(REVIEW_SELECT)
    .in('property_id', propertyIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const raws = (data ?? []) as unknown as RawReview[];
  return raws.map((raw) => ({
    ...toReviewWithReply(raw),
    property: propById.get(raw.property_id) ?? null,
  }));
}

/** Whether the signed-in guest has already reviewed a given booking. */
export async function hasReviewedBooking(bookingId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}
