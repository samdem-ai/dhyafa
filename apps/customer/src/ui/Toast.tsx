/**
 * Toast — bottom snackbar (above the tab bar), with a live region for screen
 * readers. ToastProvider mounts at the root and exposes `useToast().show(...)`.
 *
 * Uses RN's core Animated (NOT Reanimated) for the fade so it renders reliably
 * in Expo Go even if Reanimated's worklet runtime misbehaves. Tones map to
 * status colors. Auto-dismisses after a few seconds; an optional action runs and
 * dismisses.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Pressable, AccessibilityInfo, View, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Text } from './Text';
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (opts: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(opts);
      AccessibilityInfo.announceForAccessibility(opts.message);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => hide(), opts.duration ?? 3500);
    },
    [opacity, hide],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { bottom: insets.bottom + 76, opacity }]}
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
    ...theme.shadow.xs,
  },
  msg: { flex: 1 },
});
