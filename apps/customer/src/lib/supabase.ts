/**
 * Supabase client for the customer Expo app.
 *
 * Uses the anon key only — the service role key MUST never appear in
 * EXPO_PUBLIC_* vars or ship to a device. Every request is constrained
 * by Row Level Security configured on the Supabase project.
 *
 * Auth session is persisted to AsyncStorage so users remain signed in
 * across app restarts. AppState toggling of autoRefresh keeps the JWT
 * fresh when the app returns from background (important for Realtime).
 *
 * Note: @dyafa/api-client's createBrowserClient does not expose a custom
 * storage option, so we call @supabase/supabase-js directly here with an
 * AsyncStorage adapter — the anon-key-only rule still applies.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@dyafa/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

// ---------------------------------------------------------------------------
// Validate env at module load time (catches misconfiguration early in dev).
// ---------------------------------------------------------------------------
const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Copy .env.example to .env.local and fill in your Supabase project values.',
  );
}

// ---------------------------------------------------------------------------
// AsyncStorage adapter for supabase-js v2 auth persistence.
// ---------------------------------------------------------------------------
const asyncStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

// ---------------------------------------------------------------------------
// Typed Supabase client — anon key, RLS-constrained, AsyncStorage session.
// ---------------------------------------------------------------------------
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: asyncStorageAdapter,
  },
});

// ---------------------------------------------------------------------------
// AppState integration: pause/resume token auto-refresh in background.
// Keeps Realtime subscriptions from draining battery when the app is hidden.
// ---------------------------------------------------------------------------
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active') {
    supabaseClient.auth.startAutoRefresh().catch(() => null);
  } else {
    supabaseClient.auth.stopAutoRefresh().catch(() => null);
  }
});
