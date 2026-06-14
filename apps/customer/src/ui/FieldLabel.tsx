/**
 * FieldLabel — a form field's label with an optional hint line below.
 * Locale-aware typography via <Text>. Used by inputs across the wizard.
 */

import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Text } from './Text';

export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="body" weight="semibold">
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" color="textMuted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.sm },
  hint: { marginTop: 2 },
});
