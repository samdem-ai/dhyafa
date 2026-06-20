/**
 * BottomSheet — a bottom-anchored modal panel.
 *
 * Rebuilt on React Native's core `Modal` (NOT @gorhom/bottom-sheet). The
 * @gorhom sheet depends on Reanimated worklets + gesture-handler running under
 * the New Architecture, which proved unreliable in Expo Go (sheets silently
 * never presented). RN `Modal` always works in Expo Go, and plain RN
 * ScrollView/TextInput inside it behave normally (no pan-gesture conflict), so
 * callers don't need any special BottomSheet* child components.
 *
 * API is unchanged: a `visible` prop drives it; `snapPoints` first entry sets a
 * fixed height ('85%' or a dp number), otherwise the sheet sizes to content
 * (capped). Tapping the scrim (when `dismissible`) or Android back closes it.
 */

import type { ReactNode } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** First entry sets the sheet height ('85%' of screen, or a dp number). Omit to size to content. */
  snapPoints?: (number | string)[];
  /** Allow scrim-tap / back-button dismiss. Default true. */
  dismissible?: boolean;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  dismissible = true,
  testID,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const maxH = Math.round(screenH * 0.92);
  const sp = snapPoints?.[0];
  let height: number | undefined;
  if (typeof sp === 'string' && sp.trim().endsWith('%')) {
    height = Math.min(maxH, Math.round((parseFloat(sp) / 100) * screenH));
  } else if (typeof sp === 'number') {
    height = Math.min(maxH, sp);
  }

  const close = () => {
    if (dismissible) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View
            testID={testID}
            style={[
              styles.sheet,
              height ? { height } : { maxHeight: maxH },
              { paddingBottom: insets.bottom + theme.space.lg },
            ]}
          >
            <View style={styles.handle} />
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.overlay },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.sm,
    ...theme.shadow.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.borderStrong,
    marginBottom: theme.space.md,
  },
});
