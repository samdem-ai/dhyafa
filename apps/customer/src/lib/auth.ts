/**
 * Auth helpers for the customer app.
 *
 * Re-exports the supabase client under the conventional `supabase` name and
 * exposes a `useSession` hook that tracks the current auth session/user.
 *
 * As of Phase 2 the actual subscription lives in a single <AuthGate> at the
 * layout level (src/lib/authContext.tsx) — `useSession()` now just reads that
 * shared context, so every call site shares ONE onAuthStateChange subscription
 * (no per-screen subscriptions, no refetch storms, global SIGNED_OUT handling).
 * The `{ loading, session, user }` shape is unchanged for back-compat.
 *
 * Auth is email + password for M1 (phone OTP is deferred). See docs/02-auth-and-rls.md.
 */

import { AuthError } from '@supabase/supabase-js';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from './supabase';
import { useAuth, type AuthState } from './authContext';
import { L, pick } from './copy';

// Conventional alias — most call sites import `supabase`.
export const supabase = supabaseClient;

export type SessionState = AuthState;

// ---------------------------------------------------------------------------
// Auth error classification + localized copy (no raw supabase strings leak)
// ---------------------------------------------------------------------------

/** Distinguishable sign-in / sign-up failure kinds. */
export type AuthErrorCode = 'invalid_credentials' | 'email_unconfirmed' | 'rate_limited' | 'unknown';

/**
 * Map a thrown supabase auth error to a known code. Supabase v2 surfaces a
 * stable `code` (e.g. 'invalid_credentials', 'email_not_confirmed',
 * 'over_request_rate_limit') and HTTP `status` we can fall back on.
 */
export function classifyAuthError(err: unknown): AuthErrorCode {
  if (err instanceof AuthError) {
    const code = err.code ?? '';
    if (code === 'invalid_credentials' || code === 'invalid_grant') return 'invalid_credentials';
    if (code === 'email_not_confirmed') return 'email_unconfirmed';
    if (
      code === 'over_request_rate_limit' ||
      code === 'over_email_send_rate_limit' ||
      err.status === 429
    ) {
      return 'rate_limited';
    }
    // Older servers report unconfirmed email only in the message.
    const m = err.message.toLowerCase();
    if (m.includes('not confirmed') || m.includes('confirm your email')) return 'email_unconfirmed';
    if (m.includes('invalid login') || m.includes('invalid credentials')) return 'invalid_credentials';
    if (m.includes('rate limit')) return 'rate_limited';
  }
  return 'unknown';
}

/** Friendly localized message for a sign-in failure. */
export function authErrorMessage(err: unknown, locale: Locale, fallback: string): string {
  switch (classifyAuthError(err)) {
    case 'invalid_credentials':
      return pick(L.authErrorInvalid, locale);
    case 'email_unconfirmed':
      return pick(L.authErrorUnconfirmed, locale);
    case 'rate_limited':
      return pick(L.authErrorRateLimit, locale);
    default:
      return fallback;
  }
}

/**
 * Read the current auth session from the shared <AuthGate> context.
 *
 * Returns `{ loading, session, user }`. `loading` is true only for the very
 * first resolution (cold-start session restore); afterwards updates arrive
 * synchronously via the single onAuthStateChange subscription in AuthGate.
 */
export function useSession(): SessionState {
  return useAuth();
}

/** Sign in with email + password. Throws on failure. */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

/** Create an account with email + password. Throws on failure. */
export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: displayName ? { data: { display_name: displayName.trim() } } : undefined,
  });
  if (error) throw error;
}

/** Sign the current user out. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Send a password-reset email. Deep-links back via the app scheme so the user
 * lands in the app to set a new password. We intentionally do NOT surface
 * whether the address exists (anti-enumeration) — the caller shows a neutral
 * "if that email exists, we sent a link" message regardless.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: 'dyafa://reset-password',
  });
  // Swallow non-rate-limit errors to avoid leaking account existence; rethrow
  // rate-limit so the UI can tell the user to wait.
  if (error && classifyAuthError(error) === 'rate_limited') throw error;
}

/** Re-send the sign-up confirmation email for an address awaiting confirmation. */
export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
  if (error) throw error;
}
