/**
 * Splash — the branded loading view shown while fonts + locale resolve at the
 * root (replaces the bare ActivityIndicator). Bone canvas + wordmark + spinner.
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Heading } from './Text';

export function Splash() {
  return (
    <View style={styles.root}>
      <Heading level="display-lg" color="primary" weight="bold">
        Dyafa
      </Heading>
      <ActivityIndicator color={theme.color.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.color.bg,
  },
  spinner: { marginTop: theme.space.md },
});
