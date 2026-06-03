/**
 * Minimal ambient declaration for `expo-notifications`.
 *
 * The package is declared in package.json but may not be installed in every
 * environment where this app is type-checked (installs run separately). This
 * shim lets `tsc` resolve a statically analyzable `import('expo-notifications')`
 * (which Metro bundles correctly once installed) without a hard compile-time
 * dependency on the package's own d.ts.
 *
 * Only the small surface src/lib/push.ts touches is declared here; when the real
 * package is installed its bundled types take precedence at runtime.
 */
declare module 'expo-notifications' {
  export interface NotificationPermissionsStatus {
    granted: boolean;
    canAskAgain?: boolean;
    status?: string;
  }

  export interface ExpoPushToken {
    type: string;
    data: string;
  }

  export interface NotificationBehavior {
    shouldShowAlert?: boolean;
    shouldShowBanner?: boolean;
    shouldShowList?: boolean;
    shouldPlaySound?: boolean;
    shouldSetBadge?: boolean;
  }

  export interface NotificationHandler {
    handleNotification: () => Promise<NotificationBehavior>;
  }

  export interface Subscription {
    remove: () => void;
  }

  export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function getExpoPushTokenAsync(options?: {
    projectId?: string;
  }): Promise<ExpoPushToken>;
  export function setNotificationHandler(handler: NotificationHandler | null): void;
  export function addNotificationReceivedListener(
    listener: (notification: unknown) => void,
  ): Subscription;
  export function setBadgeCountAsync(count: number): Promise<boolean>;

  export const AndroidImportance: { DEFAULT: number; HIGH: number; MAX: number };
  export function setNotificationChannelAsync(
    channelId: string,
    channel: Record<string, unknown>,
  ): Promise<unknown>;
}
