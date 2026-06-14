/**
 * Supabase client for the customer Expo app.
 *
 * Uses the anon key only — the service role key MUST never appear in
 * EXPO_PUBLIC_* vars or ship to a device. Every request is constrained
 * by Row Level Security configured on the Supabase project.
 *
 * Auth session is persisted via a SecureStore-backed adapter so the refresh
 * token lives in the device keystore/keychain rather than plain AsyncStorage.
 * AppState toggling of autoRefresh keeps the JWT fresh when the app returns
 * from background (important for Realtime).
 *
 * Note: @dyafa/api-client's createBrowserClient does not expose a custom
 * storage option, so we call @supabase/supabase-js directly here with a
 * SecureStore adapter — the anon-key-only rule still applies.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@dyafa/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform, type AppStateStatus } from 'react-native';

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
// SecureStore-backed auth storage adapter for supabase-js v2.
//
// SecureStore writes to the iOS keychain / Android keystore, but a single value
// is capped at 2048 bytes. The Supabase session JSON (access + refresh token +
// user) routinely exceeds that, so we transparently CHUNK any oversized value
// across `${key}.0`, `${key}.1`, … and store a small manifest under `key` that
// records the chunk count. Small values are stored inline (manifest count 0)
// for backwards-friendly reads.
//
// On web (where SecureStore is unavailable) we fall back to AsyncStorage.
// ---------------------------------------------------------------------------

/** Max payload SecureStore accepts per item; stay comfortably under 2048. */
const SECURE_CHUNK_SIZE = 1800;

/** Manifest stored under the base key describing how a value was persisted. */
interface SecureManifest {
  /** Number of chunks (0 = the value is inline in `value`). */
  chunks: number;
  /** Inline value when not chunked. */
  value?: string;
}

const isWeb = Platform.OS === 'web';

async function secureGet(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}
async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}
async function secureDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

/**
 * A safe storage adapter that chunks values above the SecureStore size limit.
 * Implements the supabase-js SupportedStorage surface (get/set/removeItem).
 */
const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    const raw = await secureGet(key);
    if (raw == null) return null;

    let manifest: SecureManifest | null = null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed != null &&
        typeof parsed === 'object' &&
        'chunks' in parsed &&
        typeof (parsed as SecureManifest).chunks === 'number'
      ) {
        manifest = parsed as SecureManifest;
      }
    } catch {
      // Not a manifest — a legacy/plain value written before chunking. Return as-is.
      return raw;
    }
    if (manifest == null) return raw;

    if (manifest.chunks === 0) return manifest.value ?? null;

    const parts: string[] = [];
    for (let i = 0; i < manifest.chunks; i++) {
      const part = await secureGet(`${key}.${i}`);
      if (part == null) return null; // corrupt/partial — treat as missing
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    // Clear any prior chunks first so shrinking values don't leave orphans.
    await secureStoreAdapter.removeItem(key, { keepBase: true });

    if (value.length <= SECURE_CHUNK_SIZE) {
      const manifest: SecureManifest = { chunks: 0, value };
      await secureSet(key, JSON.stringify(manifest));
      return;
    }

    const chunkCount = Math.ceil(value.length / SECURE_CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const slice = value.slice(i * SECURE_CHUNK_SIZE, (i + 1) * SECURE_CHUNK_SIZE);
      await secureSet(`${key}.${i}`, slice);
    }
    const manifest: SecureManifest = { chunks: chunkCount };
    await secureSet(key, JSON.stringify(manifest));
  },

  async removeItem(key: string, opts?: { keepBase?: boolean }): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }
    // Read the manifest to learn how many chunks to delete.
    const raw = await secureGet(key);
    if (raw != null) {
      try {
        const parsed = JSON.parse(raw) as Partial<SecureManifest>;
        if (typeof parsed.chunks === 'number') {
          for (let i = 0; i < parsed.chunks; i++) {
            await secureDelete(`${key}.${i}`);
          }
        }
      } catch {
        // Legacy plain value — nothing extra to clean up.
      }
    }
    if (!opts?.keepBase) await secureDelete(key);
  },
};

// ---------------------------------------------------------------------------
// Typed Supabase client — anon key, RLS-constrained, SecureStore session.
// ---------------------------------------------------------------------------
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: secureStoreAdapter,
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
