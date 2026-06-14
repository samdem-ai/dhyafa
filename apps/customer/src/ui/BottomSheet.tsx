/**
 * BottomSheet — the interaction backbone, built on @gorhom/bottom-sheet v5.
 *
 * Declarative wrapper: a `visible` prop drives the underlying imperative
 * BottomSheetModal so callers manage open/close with plain state. Renders the
 * teal scrim backdrop (tap-to-close), rounded sheet top, drag handle, and pads
 * the bottom safe-area inset inside the content.
 *
 * Requires <BottomSheetModalProvider> mounted at the root (see app/_layout.tsx).
 */

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { theme } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Snap points (numbers in dp or `%` strings). Omit to size to content. */
  snapPoints?: (number | string)[];
  /** Allow drag-down to dismiss. Default true. */
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
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const handleDismiss = useCallback(() => {
    // Fires on drag-down or backdrop tap — keep parent state in sync.
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissible ? 'close' : 'none'}
        opacity={0.55}
      />
    ),
    [dismissible],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose={dismissible}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
    >
      <BottomSheetView
        testID={testID}
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, theme.space.lg) }]}
      >
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
  },
  handle: {
    backgroundColor: theme.color.borderStrong,
    width: 40,
  },
  content: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.sm,
  },
});
