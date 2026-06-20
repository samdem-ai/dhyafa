/**
 * Screen — the safe-area + background wrapper every screen sits in.
 *
 * Replaces the per-screen `SafeAreaView from 'react-native'` (top-only, iOS-only)
 * with `useSafeAreaInsets()` applied as padding, plus the bone canvas bg and an
 * optional scroll container, pull-to-refresh, and a sticky footer pinned above
 * the home indicator (the booking/checkout CTA pattern).
 */

import type { ReactNode } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { theme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a vertical ScrollView. */
  scroll?: boolean;
  /** Which insets to apply as padding. Default ['top']. */
  edges?: Edge[];
  /** Pull-to-refresh state (only when `scroll`). */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Sticky region pinned above the home indicator (e.g. a booking CTA). */
  footer?: ReactNode;
  /** Override the background color (defaults to the bone canvas). */
  background?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  refreshing,
  onRefresh,
  footer,
  background = theme.color.bg,
  style,
  contentContainerStyle,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingStart: edges.includes('left') ? insets.left : 0,
    paddingEnd: edges.includes('right') ? insets.right : 0,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh
          ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={theme.color.primary}
                colors={[theme.color.primary]}
              />
            )
          : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle]}>{children}</View>
  );

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: background }, padding, style]}>
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  footer: {
    backgroundColor: theme.color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.md,
    paddingHorizontal: theme.space.xl,
    ...theme.shadow.xs,
  },
});
