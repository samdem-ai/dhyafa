/**
 * Push notification registration (M3).
 *
 * Loaded dynamically (mirrors src/lib/imagePicker.ts) so the app still
 * type-checks + bundles even before `expo-notifications` is installed — the
 * dependency is declared in package.json but installs run separately. At runtime
 * a missing native module degrades to a no-op.
 *
 * What this does:
 *  - sets a foreground notification handler (so banners show while the app is
 *    open — the in-app + realtime path is the actual M3 deliverable);
 *  - requests notification permission;
 *  - retrieves the Expo push token.
 *
 * TODO (follow-up): there is NO device-token table in the schema yet, so the
 * Expo push token is deliberately NOT persisted to the server. Server-driven
 * push delivery (a `device_tokens` table + an Edge Function that fans out via
 * Expo's push API on notification insert) is a separate task. For now we only
 * log the token in dev so it can be used for manual testing.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSession } from './auth';

interface NotificationsModule {
  getPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain?: boolean }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string }>;
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert?: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
      shouldPlaySound?: boolean;
      shouldSetBadge?: boolean;
    }>;
  } | null) => void;
  setNotificationChannelAsync?: (
    channelId: string,
    channel: Record<string, unknown>,
  ) => Promise<unknown>;
  AndroidImportance?: { DEFAULT: number };
}

let handlerInstalled = false;

async function loadModule(): Promise<NotificationsModule | null> {
  try {
    const mod = (await import('expo-notifications')) as unknown as NotificationsModule;
    if (typeof mod.requestPermissionsAsync !== 'function') return null;
    return mod;
  } catch {
    return null;
  }
}

/**
 * Register for push: foreground handler + permission + token. Safe to call when
 * signed out (it just no-ops). Returns the Expo push token, or null when the
 * module is unavailable / permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const mod = await loadModule();
  if (!mod) return null;

  try {
    // Foreground notifications: show a banner while the app is open.
    if (!handlerInstalled) {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerInstalled = true;
    }

    // Android requires a channel for notifications to surface.
    if (Platform.OS === 'android' && mod.setNotificationChannelAsync) {
      await mod.setNotificationChannelAsync('default', {
        name: 'default',
        importance: mod.AndroidImportance?.DEFAULT ?? 3,
      });
    }

    const existing = await mod.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain !== false) {
      const req = await mod.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return null;

    const token = await mod.getExpoPushTokenAsync();

    // TODO(follow-up): persist `token.data` to a server `device_tokens` table so
    // an Edge Function can deliver push on notification insert. No such table
    // exists yet, so we intentionally do not store it here.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[push] Expo push token (not persisted — follow-up):', token.data);
    }
    return token.data;
  } catch {
    return null;
  }
}

/**
 * Hook: register for push once the user is signed in. In-app + realtime delivery
 * is the M3 deliverable; this only wires foreground handling + token retrieval.
 */
export function usePushRegistration(): void {
  const { user } = useSession();
  const uid = user?.id ?? null;

  useEffect(() => {
    if (!uid) return;
    void registerForPushNotifications();
  }, [uid]);
}
