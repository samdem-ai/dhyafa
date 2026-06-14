/**
 * Toast — bottom snackbar (above the tab bar), with a live region for screen
 * readers. ToastProvider mounts at the root and exposes `useToast().show(...)`.
 *
 * Tones map to status colors. Auto-dismisses after a few seconds; an optional
 * action runs and dismisses. Entrance animation is gated by reduce-motion.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Pressable, AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { theme } from '@/theme';
import { Text } from './Text';
import { useReducedMotion } from './motion';
import type { Tone } from './StatusPill';

export interface ToastOptions {
  message: string;
  tone?: Tone;
  /** Optional action button (label + handler). */
  action?: { label: string; onPress: () => void };
  /** Auto-dismiss duration in ms. Default 3500. */
  duration?: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_BG: Record<Tone, string> = {
  neutral: theme.color.text,
  success: theme.color.success,
  warning: theme.color.warning,
  error: theme.color.error,
  info: theme.color.primary,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (opts: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(opts);
      AccessibilityInfo.announceForAccessibility(opts.message);
      timer.current = setTimeout(() => setToast(null), opts.duration ?? 3500);
    },
    [],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          entering={reduced ? undefined : FadeInDown.duration(theme.motion.duration.base)}
          exiting={reduced ? undefined : FadeOutDown.duration(theme.motion.duration.fast)}
          // Sit above the tab bar (~64dp) + bottom inset.
          style={[styles.wrap, { bottom: insets.bottom + 76 }]}
        >
          <View
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: TONE_BG[toast.tone ?? 'neutral'] }]}
          >
            <Text variant="body-sm" color="textOnPrimary" style={styles.msg} numberOfLines={3}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                hitSlop={8}
              >
                <Text variant="body-sm" weight="bold" color="textOnPrimary">
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    start: theme.space.lg,
    end: theme.space.lg,
    zIndex: theme.z.toast,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    ...theme.shadow.raised,
  },
  msg: { flex: 1 },
});
