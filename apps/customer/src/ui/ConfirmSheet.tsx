/**
 * ConfirmSheet — a branded, RTL-correct replacement for Alert.alert on
 * destructive actions (cancel booking, decline request, delete photo, sign out).
 *
 * Title + body + a primary action (danger by default) + cancel. Fires a warning
 * haptic when it opens. The confirm button supports a loading state for async
 * confirms.
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Heading, Text } from './Text';
import { Button, type ButtonVariant } from './Button';
import { BottomSheet } from './BottomSheet';
import { warning as hapticWarning } from './haptics';

export interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Variant of the confirm button. Default 'danger'. */
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  testID?: string;
}

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmVariant = 'danger',
  loading = false,
  testID,
}: ConfirmSheetProps) {
  useEffect(() => {
    if (visible) hapticWarning();
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!loading} testID={testID}>
      <View style={styles.body}>
        <Heading level={3}>{title}</Heading>
        {message ? (
          <Text variant="body" color="textMuted">
            {message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label={confirmLabel} variant={confirmVariant} loading={loading} onPress={onConfirm} />
          <Button label={cancelLabel} variant="ghost" disabled={loading} onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.space.md, paddingTop: theme.space.sm },
  actions: { gap: theme.space.sm, marginTop: theme.space.md },
});
