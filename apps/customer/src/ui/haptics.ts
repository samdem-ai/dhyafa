/**
 * Centralized haptics — typed wrappers over expo-haptics so components fire a
 * consistent feel and a single global preference can mute them.
 *
 * Levels (per the UX spec):
 *   tap()       — light impact on primary button press
 *   success()   — notification(success) on booking/pay/publish/accept confirmed
 *   warning()   — notification(warning) when opening a destructive ConfirmSheet
 *   selection() — selection tick on chips / stars / steppers / segment switch
 *
 * All calls are fire-and-forget and swallow errors (haptics are unavailable on
 * some devices / web). Respect `setHapticsEnabled(false)` for a reduce-pref.
 */

import * as Haptics from 'expo-haptics';

let enabled = true;

/** Globally enable/disable haptics (e.g. from a user setting or reduce-motion). */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** Light impact — primary button taps. */
export function tap(): void {
  if (!enabled) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Medium impact — heavier affirmative presses. */
export function impact(): void {
  if (!enabled) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

/** Success notification — booking confirmed, payment done, listing published. */
export function success(): void {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
}

/** Warning notification — opening a destructive confirm sheet. */
export function warning(): void {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => undefined,
  );
}

/** Error notification — failed commit action. */
export function error(): void {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => undefined,
  );
}

/** Selection tick — chips, stars, steppers, segmented control. */
export function selection(): void {
  if (!enabled) return;
  void Haptics.selectionAsync().catch(() => undefined);
}

export const haptics = {
  tap,
  impact,
  success,
  warning,
  error,
  selection,
  setEnabled: setHapticsEnabled,
  isEnabled: isHapticsEnabled,
} as const;
