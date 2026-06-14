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

import { supabaseClient } from './supabase';
import { useAuth, type AuthState } from './authContext';

// Conventional alias — most call sites import `supabase`.
export const supabase = supabaseClient;

export type SessionState = AuthState;

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
