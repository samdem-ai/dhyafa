/**
 * Auth helpers for the customer app.
 *
 * Re-exports the supabase client under the conventional `supabase` name and
 * exposes a `useSession` hook that tracks the current auth session/user and
 * stays in sync with supabase-js auth state changes (sign-in, sign-out,
 * token refresh, restore-from-storage on cold start).
 *
 * Auth is email + password for M1 (phone OTP is deferred). See docs/02-auth-and-rls.md.
 */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseClient } from './supabase';

// Conventional alias — most call sites import `supabase`.
export const supabase = supabaseClient;

export interface SessionState {
  /** True until the initial getSession() resolves. */
  loading: boolean;
  session: Session | null;
  user: User | null;
}

/**
 * Subscribe to the Supabase auth session.
 *
 * Returns `{ loading, session, user }`. `loading` is true only for the very
 * first resolution (cold-start session restore); afterwards updates arrive
 * synchronously via onAuthStateChange.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    session: null,
    user: null,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setState({
          loading: false,
          session: data.session,
          user: data.session?.user ?? null,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState({ loading: false, session: null, user: null });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({
        loading: false,
        session,
        user: session?.user ?? null,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
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
