/**
 * AuthGate + useAuth — the single source of auth/session truth for the app.
 *
 * The legacy `useSession()` hook (src/lib/auth.ts) opens its OWN
 * onAuthStateChange subscription per call site, and sign-out was handled
 * ad-hoc per screen. AuthGate centralizes this: ONE getSession() + ONE
 * onAuthStateChange subscription at the layout level, exposed via context.
 *
 * On a global SIGNED_OUT it:
 *   - clears the TanStack Query cache (drops the previous user's rows), and
 *   - shows a toast + resets navigation to a sensible public screen (Explore).
 *
 * `useSession()` is re-pointed at this context (see src/lib/auth.ts) so every
 * existing call site shares the single subscription with no API change.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import type { Locale } from '@dyafa/i18n';
import { supabaseClient } from './supabase';
import { L, pick } from './copy';
// Import directly from the module (NOT the '@/ui' barrel) to avoid a require
// cycle: auth -> authContext -> @/ui/index -> WishlistHeart -> auth, which can
// leave barrel exports uninitialized at module-load time.
import { useToast } from '@/ui/Toast';

export interface AuthState {
  /** True until the initial getSession() resolves. */
  loading: boolean;
  session: Session | null;
  user: User | null;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Mount once at the layout level (inside QueryClientProvider + ToastProvider +
 * the router tree). Owns the one auth subscription and global SIGNED_OUT
 * handling; provides session/user/loading to the whole tree.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
  });
  const queryClient = useQueryClient();
  const toast = useToast();
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;

  // Track the previous signed-in state so we only react to a genuine sign-out
  // (not the initial SIGNED_OUT that fires on a cold start with no session).
  const wasSignedIn = useRef(false);

  useEffect(() => {
    let mounted = true;

    supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        wasSignedIn.current = data.session != null;
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

    const { data: sub } = supabaseClient.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        setState({
          loading: false,
          session,
          user: session?.user ?? null,
        });

        if (event === 'SIGNED_OUT') {
          // Only run the global handling if we were actually signed in — avoids
          // a spurious toast/reset on the cold-start SIGNED_OUT.
          if (wasSignedIn.current) {
            queryClient.clear();
            toast.show({ message: pick(L.signedOut, locale), tone: 'neutral' });
            // Reset to a public screen so no auth-gated route lingers.
            router.replace('/(tabs)');
          }
          wasSignedIn.current = false;
        } else if (session != null) {
          wasSignedIn.current = true;
        }
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // locale is read inside the SIGNED_OUT branch; re-subscribing on language
    // change is cheap and keeps the toast localized.
  }, [queryClient, toast, locale]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/**
 * Read the shared auth state. Returns the same `{ loading, session, user }`
 * shape as the legacy `useSession()` so call sites are interchangeable.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthGate>');
  }
  return ctx;
}
